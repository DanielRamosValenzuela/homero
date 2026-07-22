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
  "--contract-source", "docs/contracts/quote.openapi.yaml",
  "--countries", "CL, pe"
]);
runExpectFailure(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);

const featureWorktree = path.join(path.resolve(targetRoot, "../.homero-worktrees"), path.basename(targetRoot), "FEAT-001");
const featureDir = path.join(featureWorktree, "features", "FEAT-001");
const generatedForm = path.join(targetRoot, "src", "ui", "cl", "UserInfoForm", "index.tsx");
const generatedConstitution = path.join(targetRoot, "docs", "homero", "constitution.md");
const generatedContracts = path.join(targetRoot, "docs", "homero", "contracts.md");
const generatedWorkflow = path.join(targetRoot, "docs", "homero", "ai-workflow.md");
const generatedCopilotAgent = path.join(targetRoot, ".github", "agents", "homero-coordinator.agent.md");
const generatedClaudeAgent = path.join(targetRoot, ".claude", "agents", "homero-coordinator.md");
const featurePath = path.join(featureDir, "feature.json");
const playwrightEvidencePath = path.join(featureDir, "evidence", "playwright-cli.json");
const featureConfigPath = path.join(featureWorktree, "homero.config.json");
const config = JSON.parse(fs.readFileSync(path.join(targetRoot, "homero.config.json"), "utf8"));

const createdFeature = JSON.parse(fs.readFileSync(featurePath, "utf8"));
if (JSON.stringify(createdFeature.product?.countries) !== JSON.stringify(["cl", "pe"])) {
  console.error(`Expected product.countries to normalize to ["cl","pe"], got ${JSON.stringify(createdFeature.product?.countries)}`);
  process.exit(1);
}

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

const featureConfig = JSON.parse(fs.readFileSync(featureConfigPath, "utf8"));
const feature = JSON.parse(fs.readFileSync(featurePath, "utf8"));
feature.status = "ready";
feature.requirements.acceptanceCriteria = ["The user can submit a valid quote form."];
feature.contracts.mocks.registered = true;
feature.contracts.mocks.source = "src/mocks/quote.ts";
fs.mkdirSync(path.join(featureWorktree, "src", "mocks"), { recursive: true });
fs.writeFileSync(path.join(featureWorktree, "src", "mocks", "quote.ts"), "export const quoteMock = {};\n", "utf8");

const evidence = JSON.parse(fs.readFileSync(playwrightEvidencePath, "utf8"));
fs.mkdirSync(path.join(featureDir, "evidence", "screenshots"), { recursive: true });
fs.mkdirSync(path.join(featureDir, "evidence", "snapshots"), { recursive: true });
fs.writeFileSync(path.join(featureDir, "evidence", "screenshots", "quote-desktop.png"), "test screenshot", "utf8");
fs.writeFileSync(path.join(featureDir, "evidence", "snapshots", "quote-desktop.yaml"), "test snapshot", "utf8");
evidence.scenarios = [{
  name: "submit a valid quote form",
  status: "passed",
  screenshot: "evidence/screenshots/quote-desktop.png",
  snapshot: "evidence/snapshots/quote-desktop.yaml"
}];
fs.writeFileSync(playwrightEvidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");

featureConfig.commands = {
  lint: "node --version",
  typecheck: "node --version",
  test: "node --version",
  e2e: "node --version"
};
fs.writeFileSync(featurePath, `${JSON.stringify(feature, null, 2)}\n`, "utf8");
fs.writeFileSync(featureConfigPath, `${JSON.stringify(featureConfig, null, 2)}\n`, "utf8");

run(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);
run(["verify", "--target", targetRoot, "--id", "FEAT-001"]);

const receiptsDir = path.join(featureDir, "receipts");
if (!fs.existsSync(receiptsDir) || fs.readdirSync(receiptsDir).length === 0) {
  console.error("Expected a verification receipt for the feature");
  process.exit(1);
}

const featureBranch = spawnSync("git", ["branch", "--show-current"], { cwd: featureWorktree, encoding: "utf8" }).stdout.trim();
if (featureBranch !== "feature/FEAT-001-quote-form") {
  console.error(`Expected feature worktree branch, received: ${featureBranch}`);
  process.exit(1);
}

const mainBranch = spawnSync("git", ["branch", "--show-current"], { cwd: targetRoot, encoding: "utf8" }).stdout.trim();
if (mainBranch === "feature/FEAT-001-quote-form") {
  console.error("Expected the main checkout to stay off the feature branch");
  process.exit(1);
}

// --- Agent loop coverage ---
run(["task", "add", "--target", targetRoot, "--id", "FEAT-001", "--title", "Scaffold form", "--paths", "src/ui/cl/UserInfoForm/index.tsx"]);
run(["task", "add", "--target", targetRoot, "--id", "FEAT-001", "--title", "Add validation"]);
run(["task", "add", "--target", targetRoot, "--id", "FEAT-001", "--title", "Add validation"]);

function readState() {
  return JSON.parse(fs.readFileSync(path.join(featureDir, "state.json"), "utf8"));
}

let state = readState();
if (state.tasks.length !== 2) {
  console.error(`Expected exactly 2 tasks after a duplicate task add, got ${state.tasks.length}`);
  process.exit(1);
}

run(["run", "--target", targetRoot, "--id", "FEAT-001"]);
state = readState();
if (state.activeTaskId !== "T-001" || state.iterations !== 1) {
  console.error(`Expected T-001 active after the first run, got activeTaskId=${state.activeTaskId} iterations=${state.iterations}`);
  process.exit(1);
}

run(["task", "verify", "--target", targetRoot, "--id", "FEAT-001", "--task", "T-001", "--summary", "scaffolded"]);
run(["run", "--target", targetRoot, "--id", "FEAT-001"]);
state = readState();
if (state.activeTaskId !== "T-002" || state.iterations !== 2) {
  console.error(`Expected T-002 active after the second run, got activeTaskId=${state.activeTaskId} iterations=${state.iterations}`);
  process.exit(1);
}

run(["task", "block", "--target", targetRoot, "--id", "FEAT-001", "--task", "T-002", "--reason", "zod mismatch"]);
state = readState();
let blockedTask = state.tasks.find(task => task.id === "T-002");
if (blockedTask.status !== "pending" || blockedTask.attempts !== 1) {
  console.error(`Expected T-002 back to pending with 1 attempt, got status=${blockedTask.status} attempts=${blockedTask.attempts}`);
  process.exit(1);
}

run(["task", "verify", "--target", targetRoot, "--id", "FEAT-001", "--task", "T-002", "--summary", "fixed"]);
run(["task", "status", "--target", targetRoot, "--id", "FEAT-001"]);

state = readState();
const featureAfterLoop = JSON.parse(fs.readFileSync(featurePath, "utf8"));
const events = fs.readFileSync(path.join(featureDir, "events.ndjson"), "utf8")
  .split("\n")
  .filter(Boolean)
  .map(line => JSON.parse(line));

if (state.iterations !== 2) {
  console.error(`Expected 2 iterations after the loop, got ${state.iterations}`);
  process.exit(1);
}

if (state.tasks.length !== 2 || !state.tasks.every(task => task.status === "done")) {
  console.error("Expected both tasks to be done after the loop");
  process.exit(1);
}

if (state.phase !== "verifying") {
  console.error(`Expected phase 'verifying' after both tasks were verified, got ${state.phase}`);
  process.exit(1);
}

if (state.activeTaskId !== null) {
  console.error(`Expected no active task after both tasks were verified, got ${state.activeTaskId}`);
  process.exit(1);
}

if (featureAfterLoop.status !== "verifying") {
  console.error(`Expected feature.json status 'verifying', got ${featureAfterLoop.status}`);
  process.exit(1);
}

for (const type of ["task-added", "run-iteration", "task-blocked", "task-verified"]) {
  if (!events.some(event => event.type === type)) {
    console.error(`Expected an event of type '${type}' in events.ndjson`);
    process.exit(1);
  }
}

// --- Negative test: maxAttemptsPerTask ---
state = readState();
state.limits.maxAttemptsPerTask = 1;
const retryTask = state.tasks.find(task => task.id === "T-001");
retryTask.status = "in-progress";
retryTask.attempts = 0;
state.activeTaskId = retryTask.id;
fs.writeFileSync(path.join(featureDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");

runExpectFailure(["task", "block", "--target", targetRoot, "--id", "FEAT-001", "--task", "T-001", "--reason", "still broken"]);
state = readState();
const exhaustedTask = state.tasks.find(task => task.id === "T-001");
if (exhaustedTask.status !== "blocked") {
  console.error(`Expected T-001 to be blocked after reaching maxAttemptsPerTask, got ${exhaustedTask.status}`);
  process.exit(1);
}

if (state.phase !== "blocked") {
  console.error(`Expected phase 'blocked' once no open tasks remain, got ${state.phase}`);
  process.exit(1);
}

// --- Negative test: maxIterations ---
state = readState();
state.limits.maxIterations = state.iterations;
state.tasks.push({
  id: "T-003",
  title: "Extra task",
  paths: [],
  status: "pending",
  attempts: 0,
  summary: null,
  blockReason: null,
  createdAt: "1970-01-01T00:00:00.000Z",
  startedAt: null,
  updatedAt: "1970-01-01T00:00:00.000Z",
  completedAt: null
});
fs.writeFileSync(path.join(featureDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");

runExpectFailure(["run", "--target", targetRoot, "--id", "FEAT-001"]);
state = readState();
if (state.phase !== "exhausted") {
  console.error(`Expected phase 'exhausted' after exceeding maxIterations, got ${state.phase}`);
  process.exit(1);
}

// --- Regression: an accepted feature must never be silently un-accepted ---
state = readState();
state.limits.maxIterations = state.iterations + 10;
fs.writeFileSync(path.join(featureDir, "state.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");

const acceptedFeature = JSON.parse(fs.readFileSync(featurePath, "utf8"));
acceptedFeature.status = "accepted";
fs.writeFileSync(featurePath, `${JSON.stringify(acceptedFeature, null, 2)}\n`, "utf8");

run(["run", "--target", targetRoot, "--id", "FEAT-001"]);
state = readState();
if (state.phase !== "implementing" || state.activeTaskId !== "T-003") {
  console.error(`Expected the loop to keep advancing (T-003 in progress), got phase=${state.phase} activeTaskId=${state.activeTaskId}`);
  process.exit(1);
}

const featureAfterAccept = JSON.parse(fs.readFileSync(featurePath, "utf8"));
if (featureAfterAccept.status !== "accepted") {
  console.error(`Expected feature.json status to stay 'accepted' once a human accepted it, got ${featureAfterAccept.status}`);
  process.exit(1);
}

// --- Resilience: a missing state.json is recreated lazily instead of crashing ---
fs.rmSync(path.join(featureDir, "state.json"));
run(["task", "status", "--target", targetRoot, "--id", "FEAT-001"]);
if (!fs.existsSync(path.join(featureDir, "state.json"))) {
  console.error("Expected state.json to be recreated by `homero task status`");
  process.exit(1);
}

console.log(`Homero self-test OK: ${targetRoot}`);