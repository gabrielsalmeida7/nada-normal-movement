import { readFile } from "node:fs/promises";
import { validateDeployment } from "../src/deployment.ts";
import { root, runWrangler } from "./wrangler.mjs";
import { reviewedStagingReplacement } from "./staging-release.mjs";
import { getHead } from "../../storefront/scripts/staging.mjs";

try {
  const [target, mode, ...extra] = process.argv.slice(2);
  if (!target || (mode && mode !== "--check") || extra.length) throw new Error("DEPLOYMENT_ARGUMENTS_INVALID");
  // Keep wrangler.jsonc JSON-compatible so this guard has no parser dependency.
  const raw = await readFile(`${root}/workers/payments/wrangler.jsonc`, "utf8");
  const config = JSON.parse(raw);
  if (config.routes?.length) throw new Error("DEPLOYMENT_ROOT_ROUTES_FORBIDDEN");
  validateDeployment(target, config.env?.[target] ?? {});
  if (mode === "--check") {
    console.info("Configuração local válida. Secrets remotos e conectividade ainda não verificados.");
  } else {
    // Wrangler/Cloudflare enforce secrets.required when publishing the deployment.
    const replaceReviewed = target === "staging" &&
      reviewedStagingReplacement(config, raw, process.env, getHead());
    process.exitCode = await runWrangler(["deploy", "--env", target,
      ...(replaceReviewed ? [] : ["--strict"])]);
  }
} catch {
  // Do not echo config, parser errors or secret values.
  console.error("Deploy bloqueado: use staging|production, configure domínio, origens, Supabase e secrets obrigatórios. Consulte workers/payments/README.md.");
  process.exitCode = 1;
}
