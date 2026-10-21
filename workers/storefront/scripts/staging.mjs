import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../../", import.meta.url));
export const configPath = "workers/storefront/wrangler.jsonc";
export const manifestPath = `${root}/.wrangler/storefront-staging.json`;
const hash = data => createHash("sha256").update(data).digest("hex");

export function validateStaging(config) {
  const stage = config.env?.staging;
  const vars = stage?.vars;
  if (config.account_id !== "8f6b63890cf677004b89b130cba0dbf6" ||
      stage?.name !== "nada-normal-storefront-staging" || stage.workers_dev !== true ||
      stage.preview_urls !== false || config.routes?.length || stage.routes?.length ||
      config.triggers?.crons?.length || stage.triggers?.crons?.length ||
      vars?.APP_ENV !== "staging" || vars.SHOP_API_ENABLED !== "false" ||
      vars.RESERVATION_PROCESSOR_ENABLED !== "false" ||
      vars.SUPABASE_URL !== "https://bcemyxasbcwcrbinfguu.supabase.co" ||
      !/^sb_publishable_[A-Za-z0-9_-]+$/.test(vars.SUPABASE_PUBLISHABLE_KEY ?? "") ||
      Object.keys(vars).some(key => /SECRET|TOKEN/.test(key)) ||
      stage.assets?.directory !== "../../dist" || stage.assets.binding !== "ASSETS" ||
      stage.assets.not_found_handling !== "single-page-application" ||
      JSON.stringify(stage.assets.run_worker_first) !== JSON.stringify(["/api", "/api/*", "/health"]) ||
      !["SUPABASE_SECRET_KEY", "RESERVATION_PROCESSOR_SECRET"].every(name => stage.secrets?.required?.includes(name))) {
    throw new Error("STAGING_CONFIGURATION_INVALID");
  }
  return vars;
}

export function validateBuildContext(env, head) {
  if (env.WORKERS_CI !== "1" || env.WORKERS_CI_BRANCH !== "home-v2-contraste" ||
      !/^[a-f0-9]{40}$/.test(head) || env.WORKERS_CI_COMMIT_SHA !== head) {
    throw new Error("STAGING_BRANCH_OR_COMMIT_INVALID");
  }
}

export function frontendEnv(vars, inherited = process.env) {
  return { ...inherited, VITE_SUPABASE_URL: vars.SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: vars.SUPABASE_PUBLISHABLE_KEY,
    VITE_CHECKOUT_PRO_ENABLED: "false", VITE_PAYMENTS_API_URL: "" };
}

export function runNode(args, env = process.env, capture = false) {
  return execFileSync(process.execPath, args, { cwd: root, env: {
    ...env, WRANGLER_SEND_METRICS: "false", WRANGLER_LOG_PATH: `${root}/.wrangler/logs`,
  }, ...(capture ? { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] } : { stdio: "inherit" }) });
}

export const wranglerArgs = args => ["node_modules/wrangler/bin/wrangler.js", ...args, "--config", configPath];
export const getHead = () => execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();

export async function fingerprint(directory = `${root}/dist`, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const parts = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isSymbolicLink()) throw new Error("BUILD_SYMLINK_FORBIDDEN");
    const name = `${prefix}${entry.name}`;
    parts.push(entry.isDirectory() ? await fingerprint(`${directory}/${entry.name}`, `${name}/`)
      : `${name}:${hash(await readFile(`${directory}/${entry.name}`))}`);
  }
  return hash(parts.join("\n"));
}

export async function prepareStaging() {
  const text = await readFile(`${root}/${configPath}`, "utf8");
  const vars = validateStaging(JSON.parse(text));
  runNode(["node_modules/vite/bin/vite.js", "build"], frontendEnv(vars));
  // Generated staging-only assets; source robots.txt and production build remain unchanged.
  await writeFile(`${root}/dist/robots.txt`, "User-agent: *\nDisallow: /\n");
  const headers = await readFile(`${root}/dist/_headers`, "utf8");
  await writeFile(`${root}/dist/_headers`, `${headers}\n/*\n  X-Robots-Tag: noindex, nofollow\n`);
  await mkdir(`${root}/.wrangler`, { recursive: true });
  await writeFile(manifestPath, JSON.stringify({ commit: getHead(), config: hash(text),
    assets: await fingerprint(), paymentsEnabled: false }));
}

export async function checkManifest() {
  const text = await readFile(`${root}/${configPath}`, "utf8");
  validateStaging(JSON.parse(text));
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.commit !== getHead() || manifest.config !== hash(text) ||
      manifest.assets !== await fingerprint() || manifest.paymentsEnabled !== false) {
    throw new Error("STAGING_BUILD_STALE");
  }
}
