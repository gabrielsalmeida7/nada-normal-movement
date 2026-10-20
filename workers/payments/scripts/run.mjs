import { runWrangler } from "./wrangler.mjs";

const command = process.argv[2];
if (command === "dev") {
  process.exitCode = await runWrangler(["dev", "--env", "", "--local", "--ip", "127.0.0.1", "--port", "8787"]);
} else if (command === "build") {
  process.exitCode = await runWrangler(["deploy", "--env", "", "--dry-run", "--outdir", ".wrangler/build"]);
} else {
  console.error("Use dev ou build.");
  process.exitCode = 1;
}
