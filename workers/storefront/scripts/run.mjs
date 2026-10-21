import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareStaging } from "./staging.mjs";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const command = process.argv[2];
const commands = {
  dev: ["dev", "--env", "", "--local", "--ip", "127.0.0.1", "--port", "8788"],
  build: ["deploy", "--env", "staging", "--dry-run", "--outdir", ".wrangler/build"],
  types: ["types", "workers/storefront/src/env.d.ts", "--env", "staging", "--env-interface", "StorefrontBindings", "--strict-vars=false", "--include-runtime=false"],
};
if (command === "prepare") {
  try { await prepareStaging(); }
  catch { console.error("Build de staging bloqueado: revisar configuração pública e dependências."); process.exitCode = 1; }
} else if (!commands[command]) {
  console.error("Use dev, build ou types.");
  process.exitCode = 1;
} else {
  const code = await new Promise(resolve => {
    const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...commands[command],
      "--config", "workers/storefront/wrangler.jsonc"], {
      cwd: root, stdio: "inherit", env: { ...process.env, WRANGLER_SEND_METRICS: "false",
        WRANGLER_LOG_PATH: `${root}/.wrangler/logs` },
    });
    child.on("error", () => resolve(1));
    child.on("exit", code => resolve(code ?? 1));
  });
  process.exitCode = code;
}
