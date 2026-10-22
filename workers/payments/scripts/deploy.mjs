import { readFile } from "node:fs/promises";
import { validateDeployment } from "../src/deployment.ts";
import { root, runWrangler } from "./wrangler.mjs";
import { validatePaymentRelease, validateKnownBootstrap } from "./staging-release.mjs";
import { runNode, getHead, validateBuildContext } from "../../storefront/scripts/staging.mjs";

try {
  const [target, mode, ...extra] = process.argv.slice(2);
  if (!target || (mode && !["--check", "--replace-known-bootstrap"].includes(mode)) || extra.length) throw new Error("DEPLOYMENT_ARGUMENTS_INVALID");
  // Keep wrangler.jsonc JSON-compatible so this guard has no parser dependency.
  const config = JSON.parse(await readFile(`${root}/workers/payments/wrangler.jsonc`, "utf8"));
  if (config.routes?.length) throw new Error("DEPLOYMENT_ROOT_ROUTES_FORBIDDEN");
  validateDeployment(target, config.env?.[target] ?? {});
  if (mode === "--check") {
    console.info("Configuração local válida. Secrets remotos e conectividade ainda não verificados.");
  } else {
    const bootstrap = mode === "--replace-known-bootstrap";
    if (bootstrap) {
      validatePaymentRelease(config);
      validateBuildContext(process.env, getHead());
      if (target !== "staging" || process.env.PAYMENTS_REPLACE_BOOTSTRAP !== "1") throw new Error("BOOTSTRAP_NOT_AUTHORIZED");
      const inspect = group => JSON.parse(runNode(["node_modules/wrangler/bin/wrangler.js",
        group, "list", "--config", "workers/payments/wrangler.jsonc", "--env", "staging", "--json"], process.env, true));
      validateKnownBootstrap(inspect("versions"), inspect("deployments"));
    }
    // Wrangler/Cloudflare enforce secrets.required when publishing the deployment.
    process.exitCode = await runWrangler(["deploy", "--env", target, ...(bootstrap ? [] : ["--strict"])]);
  }
} catch {
  // Do not echo config, parser errors or secret values.
  console.error("Deploy bloqueado: use staging|production, configure domínio, origens, Supabase e secrets obrigatórios. Consulte workers/payments/README.md.");
  process.exitCode = 1;
}
