import { readFile } from "node:fs/promises";
import { validateDeployment } from "../src/deployment.ts";
import { root, runWrangler } from "./wrangler.mjs";

try {
  const [target, mode, ...extra] = process.argv.slice(2);
  if (!target || (mode && mode !== "--check") || extra.length) throw new Error("DEPLOYMENT_ARGUMENTS_INVALID");
  // Keep wrangler.jsonc JSON-compatible so this guard has no parser dependency.
  const config = JSON.parse(await readFile(`${root}/workers/payments/wrangler.jsonc`, "utf8"));
  if (config.routes?.length) throw new Error("DEPLOYMENT_ROOT_ROUTES_FORBIDDEN");
  validateDeployment(target, config.env?.[target] ?? {});
  if (mode === "--check") {
    console.info("Configuração local válida. Secrets remotos e conectividade ainda não verificados.");
  } else {
    // Wrangler/Cloudflare enforce secrets.required when publishing the deployment.
    process.exitCode = await runWrangler(["deploy", "--env", target, "--strict"]);
  }
} catch {
  // Do not echo config, parser errors or secret values.
  console.error("Deploy bloqueado: use staging|production, configure domínio, origens, Supabase e secrets obrigatórios. Consulte workers/payments/README.md.");
  process.exitCode = 1;
}
