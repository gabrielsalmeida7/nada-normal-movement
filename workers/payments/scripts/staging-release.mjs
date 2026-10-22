import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { validateDeployment } from "../src/deployment.ts";
import { root, runNode, getHead, fingerprint, validateBuildContext } from "../../storefront/scripts/staging.mjs";

const configPath = "workers/payments/wrangler.jsonc";
const bundlePath = `${root}/.wrangler/payments-release`;
const manifestPath = `${root}/.wrangler/payments-release.json`;
const digest = value => createHash("sha256").update(value).digest("hex");

export function validatePaymentRelease(config) {
  validateDeployment("staging", config.env?.staging ?? {});
  const stage = config.env.staging;
  const vars = stage.vars;
  const origin = "https://nada-normal-storefront-staging.gabriel-salmeida7.workers.dev";
  if (config.account_id !== "8f6b63890cf677004b89b130cba0dbf6" ||
      stage.name !== "nada-normal-payments-staging" || config.routes?.length ||
      JSON.stringify(stage.routes) !== JSON.stringify([{ pattern: "pagamentos-staging.nadanormalclub.com.br", custom_domain: true }]) ||
      config.triggers?.crons?.length || stage.triggers?.crons?.length ||
      vars.PAYMENTS_ENABLED !== "false" || vars.CHECKOUT_PRO_MODE !== "sandbox" ||
      vars.ALLOWED_ORIGINS !== origin || vars.CHECKOUT_RETURN_ORIGIN !== origin ||
      vars.CHECKOUT_WEBHOOK_URL !== "https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago" ||
      vars.MP_COLLECTOR_ID !== "3272217989" ||
      vars.SUPABASE_URL !== "https://bcemyxasbcwcrbinfguu.supabase.co" ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(vars.SUPABASE_PUBLISHABLE_KEY ?? "") ||
      Object.keys(vars).some(key => /SECRET|TOKEN/.test(key))) {
    throw new Error("PAYMENTS_RELEASE_CONFIGURATION_INVALID");
  }
}

export function validateKnownBootstrap(versions, deployments) {
  // Immutable versions from the authorized Hello World / read-only probe migration.
  // Wrangler JSON lists oldest first; API responses may use the opposite order.
  const newest = (items, date) => [...(items ?? [])]
    .sort((a, b) => String(date(a) ?? "").localeCompare(String(date(b) ?? ""))).at(-1);
  const latest = newest(Array.isArray(versions) ? versions : versions?.items, v => v.metadata?.created_on);
  const active = newest(Array.isArray(deployments) ? deployments : deployments?.deployments, d => d.created_on)?.versions;
  if (latest?.id !== "26b0b315-ca7f-4144-b7b1-ed7ff0d45e14" ||
      active?.length !== 1 || active[0].version_id !== "ed97243c-3c59-4e23-bf7f-75b38a277513" ||
      active[0].percentage !== 100) throw new Error("BOOTSTRAP_REMOTE_STATE_CHANGED");
}

async function main(mode) {
  const raw = await readFile(`${root}/${configPath}`, "utf8");
  const config = JSON.parse(raw);
  validatePaymentRelease(config);
  if (mode === "check") {
    console.info("Payments staging release valid offline; no deployment or secret access.");
    return;
  }
  if (mode === "prepare") {
    for (const args of [
      ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "workers/payments/tsconfig.json"],
      ["node_modules/vitest/vitest.mjs", "run"],
      ["node_modules/vitest/vitest.mjs", "run", "--config", "workers/payments/vitest.config.ts"],
      ["node_modules/wrangler/bin/wrangler.js", "deploy", "--config", configPath,
        "--env", "staging", "--dry-run", "--outdir", bundlePath],
    ]) runNode(args);
    await mkdir(`${root}/.wrangler`, { recursive: true });
    await writeFile(manifestPath, JSON.stringify({ commit: getHead(), config: digest(raw),
      bundle: await fingerprint(bundlePath), paymentsEnabled: false }));
    return;
  }
  if (mode !== "deploy") throw new Error("INVALID_RELEASE_MODE");
  validateBuildContext(process.env, getHead());
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.commit !== getHead() || manifest.config !== digest(raw) ||
      manifest.bundle !== await fingerprint(bundlePath) || manifest.paymentsEnabled !== false) {
    throw new Error("PAYMENTS_RELEASE_STALE");
  }
  const secrets = JSON.parse(runNode(["node_modules/wrangler/bin/wrangler.js", "secret", "list",
    "--config", configPath, "--env", "staging", "--format", "json"], process.env, true));
  if (!config.env.staging.secrets.required.every(name => secrets.some(secret => secret.name === name))) {
    throw new Error("PAYMENTS_SECRETS_MISSING");
  }
  // Reuse the normal deployment guard; never replace it with a direct upload.
  runNode(["--experimental-strip-types", "workers/payments/scripts/deploy.mjs", "staging",
    ...(process.env.PAYMENTS_REPLACE_BOOTSTRAP === "1" ? ["--replace-known-bootstrap"] : [])]);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    if (process.argv.length !== 3) throw new Error("INVALID_ARGUMENTS");
    await main(process.argv[2]);
  } catch {
    console.error("Payments release blocked: verify staging, branch, commit, prepared build and required secrets.");
    process.exitCode = 1;
  }
}
