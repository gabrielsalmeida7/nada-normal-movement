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
  const scheduled = vars.CHECKOUT_RECONCILIATION_ENABLED === "true";
  const crons = stage.triggers?.crons ?? [];
  if (config.account_id !== "8f6b63890cf677004b89b130cba0dbf6" ||
      !stage.secrets?.required?.includes("MP_TEST_WEBHOOK_SECRET") ||
      stage.name !== "nada-normal-payments-staging" || config.routes?.length ||
      JSON.stringify(stage.routes) !== JSON.stringify([{ pattern: "pagamentos-staging.nadanormalclub.com.br", custom_domain: true }]) ||
      config.triggers?.crons?.length ||
      JSON.stringify(crons) !== JSON.stringify(scheduled ? ["*/5 * * * *"] : []) ||
      stage.observability?.enabled !== true || stage.observability.redact_query_string !== true ||
      stage.observability.logs?.enabled !== true || stage.observability.logs.invocation_logs !== false ||
      stage.observability.logs.persist !== true || stage.observability.traces?.enabled !== false ||
      !["false", "true"].includes(vars.PAYMENTS_ENABLED) || vars.CHECKOUT_PRO_MODE !== "sandbox" ||
      vars.ALLOWED_ORIGINS !== origin || vars.CHECKOUT_RETURN_ORIGIN !== origin ||
      vars.CHECKOUT_WEBHOOK_URL !== "https://pagamentos-staging.nadanormalclub.com.br/webhooks/mercadopago" ||
      vars.MP_COLLECTOR_ID !== "3272217989" ||
      vars.MP_APPLICATION_ID !== "4897243060269064" ||
      vars.MP_TEST_APPLICATION_ID !== "5855568499515388" || vars.MP_TEST_BUYER_ID !== "3272217991" ||
      vars.SUPABASE_URL !== "https://bcemyxasbcwcrbinfguu.supabase.co" ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(vars.SUPABASE_PUBLISHABLE_KEY ?? "") ||
      Object.keys(vars).some(key => /SECRET|TOKEN/.test(key))) {
    throw new Error("PAYMENTS_RELEASE_CONFIGURATION_INVALID");
  }
}

// One reviewed config may replace dashboard/API edits during this staging rollout.
// The default remains strict, and enabled payments or any other config are refused.
export function reviewedStagingReplacement(config, raw, env, head) {
  const expected = env.PAYMENTS_REVIEWED_STAGING_CONFIG_SHA256;
  if (expected === undefined) return false;
  validateBuildContext(env, head);
  validatePaymentRelease(config);
  if (!/^[a-f0-9]{64}$/.test(expected) || expected !== digest(raw) ||
      config.env.staging.vars.PAYMENTS_ENABLED !== "false" ||
      config.env.staging.vars.CHECKOUT_RECONCILIATION_ENABLED !== "false") {
    throw new Error("REVIEWED_STAGING_CONFIG_MISMATCH");
  }
  return true;
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
      bundle: await fingerprint(bundlePath), paymentsEnabled: config.env.staging.vars.PAYMENTS_ENABLED === "true" }));
    return;
  }
  if (mode !== "deploy") throw new Error("INVALID_RELEASE_MODE");
  validateBuildContext(process.env, getHead());
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.commit !== getHead() || manifest.config !== digest(raw) ||
      manifest.bundle !== await fingerprint(bundlePath) ||
      manifest.paymentsEnabled !== (config.env.staging.vars.PAYMENTS_ENABLED === "true")) {
    throw new Error("PAYMENTS_RELEASE_STALE");
  }
  const secrets = JSON.parse(runNode(["node_modules/wrangler/bin/wrangler.js", "secret", "list",
    "--config", configPath, "--env", "staging", "--format", "json"], process.env, true));
  if (!config.env.staging.secrets.required.every(name => secrets.some(secret => secret.name === name))) {
    throw new Error("PAYMENTS_SECRETS_MISSING");
  }
  // Reuse the normal deployment guard; never replace it with a direct upload.
  runNode(["--experimental-strip-types", "workers/payments/scripts/deploy.mjs", "staging"]);
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
