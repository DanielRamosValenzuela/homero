import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");
const cliPath = path.join(repoRoot, "packages", "cli", "bin", "homero.mjs");
const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-"));

function run(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["init", "--target", targetRoot, "--client", "copilot", "--project-name", "homero-self-test"]);
run(["discover", "--target", targetRoot, "--defaults", "--force"]);
run(["validate", "--target", targetRoot, "--client", "copilot"]);
run(["generate", "form", "--target", targetRoot, "--name", "UserInfoForm", "--country", "cl"]);

const generatedForm = path.join(targetRoot, "src", "ui", "cl", "UserInfoForm", "index.tsx");
const generatedConstitution = path.join(targetRoot, "docs", "homero", "constitution.md");
const generatedContracts = path.join(targetRoot, "docs", "homero", "contracts.md");
const generatedWorkflow = path.join(targetRoot, "docs", "homero", "ai-workflow.md");
const generatedCopilotAgent = path.join(targetRoot, ".github", "agents", "homero-coordinator.agent.md");
const config = JSON.parse(fs.readFileSync(path.join(targetRoot, "homero.config.json"), "utf8"));

if (!fs.existsSync(generatedForm)) {
  console.error(`Expected generated form not found: ${generatedForm}`);
  process.exit(1);
}

if (!fs.existsSync(generatedConstitution)) {
  console.error(`Expected generated constitution not found: ${generatedConstitution}`);
  process.exit(1);
}

if (!fs.existsSync(generatedContracts)) {
  console.error(`Expected generated contracts not found: ${generatedContracts}`);
  process.exit(1);
}

if (!fs.existsSync(generatedWorkflow)) {
  console.error(`Expected generated workflow not found: ${generatedWorkflow}`);
  process.exit(1);
}

if (!fs.existsSync(generatedCopilotAgent)) {
  console.error(`Expected generated Copilot agent not found: ${generatedCopilotAgent}`);
  process.exit(1);
}

if (!config.contracts?.mode) {
  console.error("Expected homero.config.json to include contracts.mode");
  process.exit(1);
}

if (!config.agents?.coordinator) {
  console.error("Expected homero.config.json to include agents.coordinator");
  process.exit(1);
}

console.log(`Homero self-test OK: ${targetRoot}`);