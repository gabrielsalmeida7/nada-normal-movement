import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const command = process.argv[2];
const commands = {
  dev: ["dev", "--env", "", "--local", "--ip", "127.0.0.1", "--port", "8788"],
  build: ["deploy", "--env", "staging", "--dry-run", "--outdir", ".wrangler/build"],
  types: ["types", "workers/storefront/src/env.d.ts", "--env", "staging", "--env-interface", "StorefrontBindings", "--strict-vars=false", "--include-runtime=false"],
};
if (command === "deploy") {
  // Public routing/secrets and approval belong to Step 3, not this code preparation.
  console.error("Deploy da loja bloqueado nesta etapa. Concluir a preparação de staging do passo 3.");
  process.exitCode = 1;
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
