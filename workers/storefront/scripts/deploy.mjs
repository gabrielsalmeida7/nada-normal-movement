import { readFile } from "node:fs/promises";
import {
  root, configPath, validateStaging, validateBuildContext, checkManifest,
  runNode, wranglerArgs, getHead,
} from "./staging.mjs";

try {
  const args = process.argv.slice(2);
  if (args.length && !(args.length === 1 && args[0] === "--check")) throw new Error("INVALID_ARGUMENTS");
  const config = JSON.parse(await readFile(`${root}/${configPath}`, "utf8"));
  validateStaging(config);
  if (args[0] === "--check") {
    console.info("Staging válido offline. Nenhuma publicação; credenciais e build ainda não verificados.");
  } else {
    validateBuildContext(process.env, getHead());
    await checkManifest();
    // Only names/types are read. Never download, print or recreate existing secrets.
    const secrets = JSON.parse(runNode(wranglerArgs(["secret", "list", "--env", "staging", "--format", "json"]), process.env, true));
    if (!config.env.staging.secrets.required.every(name => secrets.some(secret => secret.name === name))) {
      throw new Error("STAGING_SECRETS_MISSING");
    }
    // Tests are a release gate, not just a separate GitHub check running concurrently.
    for (const args of [
      ["node_modules/typescript/bin/tsc", "--noEmit", "-p", "workers/storefront/tsconfig.json"],
      ["node_modules/vitest/vitest.mjs", "run"],
      ["node_modules/vitest/vitest.mjs", "run", "--config", "workers/payments/vitest.config.ts"],
      wranglerArgs(["deploy", "--env", "staging", "--dry-run", "--outdir", ".wrangler/build"]),
      ["node_modules/vitest/vitest.mjs", "run", "--config", "workers/storefront/vitest.config.ts"],
    ]) runNode(args);
    await checkManifest();
    runNode(wranglerArgs(["deploy", "--env", "staging", "--keep-vars"]));
  }
} catch {
  console.error("Publicação bloqueada: exige Workers Builds, branch home-v2-contraste, commit correto, shop:prepare atual, configuração de staging e secrets presentes. Nenhuma chave foi exibida.");
  process.exitCode = 1;
}
