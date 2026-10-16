import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../../", import.meta.url));

export function runWrangler(args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["node_modules/wrangler/bin/wrangler.js", ...args,
      "--config", "workers/payments/wrangler.jsonc"], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, WRANGLER_SEND_METRICS: "false",
        WRANGLER_LOG_PATH: process.env.WRANGLER_LOG_PATH ?? `${root}/.wrangler/logs` },
    });
    child.on("error", () => resolve(1));
    child.on("exit", (code) => resolve(code ?? 1));
  });
}
