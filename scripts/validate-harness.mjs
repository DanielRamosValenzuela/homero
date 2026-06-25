import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const cliPath = path.resolve(currentDir, "..", "packages", "cli", "bin", "homero.mjs");
const result = spawnSync(process.execPath, [cliPath, "validate", ...process.argv.slice(2)], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);
