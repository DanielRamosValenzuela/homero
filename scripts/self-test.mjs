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

function runExpectFailure(args) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status === 0) {
    console.error(`Expected command to fail: homero ${args.join(" ")}`);
    process.exit(1);
  }
}

function runGit(args) {
  const result = spawnSync("git", args, {
    cwd: targetRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run(["init", "--target", targetRoot, "--client", "both", "--project-name", "homero-self-test"]);
run(["discover", "--target", targetRoot, "--defaults", "--force"]);
run(["validate", "--target", targetRoot, "--client", "both"]);
fs.writeFileSync(
  path.join(targetRoot, "package.json"),
  `${JSON.stringify({ name: "homero-self-test", private: true, packageManager: "pnpm@10.0.0" }, null, 2)}\n`,
  "utf8"
);
run(["setup", "playwright", "--target", targetRoot, "--dry-run"]);
run(["generate", "form", "--target", targetRoot, "--name", "UserInfoForm", "--country", "cl"]);

runGit(["init"]);
runGit(["add", "."]);
runGit(["-c", "user.name=Homero Test", "-c", "user.email=homero@example.test", "commit", "-m", "chore: install homero"]);
run([
  "feature",
  "create",
  "--target", targetRoot,
  "--id", "FEAT-001",
  "--name", "Quote form",
  "--figma", "https://www.figma.com/design/example/quote?node-id=1-2",
  "--figma-version", "approved-v1",
  "--contract-mode", "contract-draft",
  "--contract-source", "docs/contracts/quote.openapi.yaml"
]);
runExpectFailure(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);

const generatedForm = path.join(targetRoot, "src", "ui", "cl", "UserInfoForm", "index.tsx");
const generatedConstitution = path.join(targetRoot, "docs", "homero", "constitution.md");
const generatedContracts = path.join(targetRoot, "docs", "homero", "contracts.md");
const generatedWorkflow = path.join(targetRoot, "docs", "homero", "ai-workflow.md");
const generatedCopilotAgent = path.join(targetRoot, ".github", "agents", "homero-coordinator.agent.md");
const generatedClaudeAgent = path.join(targetRoot, ".claude", "agents", "homero-coordinator.md");
const featurePath = path.join(targetRoot, "features", "FEAT-001", "feature.json");
const playwrightEvidencePath = path.join(targetRoot, "features", "FEAT-001", "evidence", "playwright-cli.json");
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

if (!fs.existsSync(generatedClaudeAgent)) {
  console.error(`Expected generated Claude agent not found: ${generatedClaudeAgent}`);
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

const feature = JSON.parse(fs.readFileSync(featurePath, "utf8"));
feature.status = "ready";
feature.requirements.acceptanceCriteria = ["The user can submit a valid quote form."];
feature.contracts.mocks.registered = true;
feature.contracts.mocks.source = "src/mocks/quote.ts";
fs.mkdirSync(path.join(targetRoot, "src", "mocks"), { recursive: true });
fs.writeFileSync(path.join(targetRoot, "src", "mocks", "quote.ts"), "export const quoteMock = {};\n", "utf8");

const evidence = JSON.parse(fs.readFileSync(playwrightEvidencePath, "utf8"));
fs.mkdirSync(path.join(targetRoot, "features", "FEAT-001", "evidence", "screenshots"), { recursive: true });
fs.mkdirSync(path.join(targetRoot, "features", "FEAT-001", "evidence", "snapshots"), { recursive: true });
fs.writeFileSync(path.join(targetRoot, "features", "FEAT-001", "evidence", "screenshots", "quote-desktop.png"), "test screenshot", "utf8");
fs.writeFileSync(path.join(targetRoot, "features", "FEAT-001", "evidence", "snapshots", "quote-desktop.yaml"), "test snapshot", "utf8");
evidence.scenarios = [{
  name: "submit a valid quote form",
  status: "passed",
  screenshot: "evidence/screenshots/quote-desktop.png",
  snapshot: "evidence/snapshots/quote-desktop.yaml"
}];
fs.writeFileSync(playwrightEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

config.commands = {
  lint: "node --version",
  typecheck: "node --version",
  test: "node --version",
  e2e: "node --version"
};
fs.writeFileSync(featurePath, `${JSON.stringify(feature, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(targetRoot, "homero.config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8");

run(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);
run(["verify", "--target", targetRoot, "--id", "FEAT-001"]);

const receiptsDir = path.join(targetRoot, "features", "FEAT-001", "receipts");
if (!fs.existsSync(receiptsDir) || fs.readdirSync(receiptsDir).length === 0) {
  console.error("Expected a verification receipt for the feature");
  process.exit(1);
}

const branch = spawnSync("git", ["branch", "--show-current"], { cwd: targetRoot, encoding: "utf8" }).stdout.trim();
if (branch !== "feature/FEAT-001-quote-form") {
  console.error(`Expected feature branch, received: ${branch}`);
  process.exit(1);
}

console.log(`Homero self-test OK: ${targetRoot}`);