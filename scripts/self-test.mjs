import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "..");
const sourceCliPath = path.join(repoRoot, "packages", "cli", "bin", "homero.mjs");
const targetRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-"));
const copiedCliPath = path.join(targetRoot, "scripts", "homero", "homero.mjs");

// `init`/`validate` always run from the source repo (they need templates/).
// Everything else runs from the file `init` copies into the target repo, to
// prove Homero works standalone there with zero devDependency/registry access.
let activeCliPath = sourceCliPath;

function run(args, { cliPath = activeCliPath } = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

// Same contract as `run`, but returns combined stdout+stderr instead of streaming it, for
// the handful of assertions that need to check a specific warning was actually printed
// rather than just that the process exited 0.
function runCaptureOutput(args, { cliPath = activeCliPath } = {}) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }

  return `${result.stdout}\n${result.stderr}`;
}

function runExpectFailure(args, { cliPath = activeCliPath } = {}) {
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

// Same slugify() the CLI uses to derive specs/<id>-<slug>/ — kept in lockstep manually since
// self-test drives the CLI as a subprocess and cannot import its internals directly.
function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Fills every section `planErrors()` requires non-empty (principle 18, constitution.md) with
// throwaway-but-real content, so a feature's `feature check`/`run`/`verify` calls below exercise
// the actual gate instead of failing on the untouched specs/_template/plan.md placeholder.
function fillRequiredPlanSections(specDir) {
  const planPath = path.join(specDir, "plan.md");
  // The shipped template uses CRLF. Normalize once so `${heading}\n` lookups below are not
  // silently broken by a `\r` sitting between the heading text and the newline.
  let plan = fs.readFileSync(planPath, "utf8").replace(/\r\n/g, "\n");

  const fills = {
    "## Technical summary": "\n\nSelf-test placeholder technical summary.\n",
    "## Tomaco components and tokens": "\n\n- Card (props: title, footer) using --spacing-16 padding.\n",
    "## Pixel-perfect styling": "\n\n- Desktop: 24px padding via .p24; mobile: 16px padding via .p16.\n",
    "## Files to create or modify": "\n\n- src/ui/cl/SelfTestFeature/index.tsx\n",
    "## Form and validation plan": "\n\n- Not applicable — this feature has no form.\n",
    "## Figma adaptation plan": "\n\n- Mobile stacks the two columns from desktop.\n"
  };

  for (const [heading, filledBody] of Object.entries(fills)) {
    const headingIndex = plan.indexOf(`${heading}\n`);
    if (headingIndex === -1) {
      console.error(`Expected plan.md template to contain heading: ${heading}`);
      process.exit(1);
    }

    const bodyStart = headingIndex + `${heading}\n`.length;
    const nextHeadingIndex = plan.indexOf("\n## ", bodyStart);
    const bodyEnd = nextHeadingIndex === -1 ? plan.length : nextHeadingIndex;
    plan = `${plan.slice(0, bodyStart)}${filledBody}${plan.slice(bodyEnd)}`;
  }

  fs.writeFileSync(planPath, plan, "utf8");
}

// --- Version invariant ---
// Everything Homero reports about versions (the stamp in homero.config.json, `homero
// version`, the drift warning, the upgrade banner) comes from a constant in the CLI, not
// from package.json — a vendored scripts/homero/homero.mjs has no package.json to read.
// If the constant and the manifest drift, every one of those readings is a lie.
const homeroVersionMatch = fs.readFileSync(sourceCliPath, "utf8").match(/^const homeroVersion = "([^"]+)";$/m);

if (!homeroVersionMatch) {
  console.error(`Expected a \`const homeroVersion = "..."\` declaration in ${sourceCliPath}`);
  process.exit(1);
}

const homeroVersionConstant = homeroVersionMatch[1];
const manifestVersion = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8")).version;

if (homeroVersionConstant !== manifestVersion) {
  console.error(`homeroVersion constant is ${homeroVersionConstant} but package.json version is ${manifestVersion} — keep them in lockstep`);
  process.exit(1);
}

// --- Adapter content-parity structural check ---
// `homero validate` only checks that a client's own template tree exists in a target repo, not
// that Claude and Copilot cover the same ground (docs/architecture.md). This does not diff
// wording — that stays a manual-authoring invariant — but it does catch a whole topic silently
// missing on one side, which is exactly the kind of drift that let
// rules/server-actions.md + rules/transport-patterns.md fall out of sync with their Copilot
// equivalents unnoticed. Runs against the source templates directly, no target repo needed.
// `figma-to-component`/`new-form`/`new-step` are intentionally excluded: they are Claude-only
// skill invocations with no Copilot prompt-file equivalent, not a gap.
const claudeAdapterBase = path.join(repoRoot, "templates", "claude", ".claude");
const copilotAdapterBase = path.join(repoRoot, "templates", "copilot", ".github");

const pairedAdapterTopics = [
  ["forms", "rules/forms.md", "instructions/forms.instructions.md"],
  ["frontend", "rules/frontend.md", "instructions/frontend.instructions.md"],
  ["server-actions", "rules/server-actions.md", "instructions/server-actions.instructions.md"],
  ["transport/proxy", "rules/transport-patterns.md", "instructions/transport.instructions.md"],
  ["step-widgets", "rules/step-widgets.md", "instructions/step-widgets.instructions.md"],
  ["tomaco design system", "skills/tomaco-design-system/SKILL.md", "instructions/tomaco-design-system.instructions.md"],
  ["seguros-falabella-ui-ux", "skills/seguros-falabella-ui-ux/SKILL.md", "instructions/seguros-falabella-ui-ux.instructions.md"],
  ["entry command", "commands/homero.md", "prompts/homero.prompt.md"],
  ["discover command", "commands/homero-discover.md", "prompts/homero-discover.prompt.md"]
];

for (const role of ["contracts", "coordinator", "discovery", "figma", "implementer", "planner", "reviewer"]) {
  pairedAdapterTopics.push([`agent: ${role}`, `agents/homero-${role}.md`, `agents/homero-${role}.agent.md`]);
}

const adapterParityErrors = [];
for (const [topic, claudeRelative, copilotRelative] of pairedAdapterTopics) {
  const claudeExists = fs.existsSync(path.join(claudeAdapterBase, claudeRelative));
  const copilotExists = fs.existsSync(path.join(copilotAdapterBase, copilotRelative));

  if (claudeExists !== copilotExists) {
    adapterParityErrors.push(
      `"${topic}" exists on only one adapter (claude ${claudeRelative}: ${claudeExists ? "present" : "MISSING"}; copilot ${copilotRelative}: ${copilotExists ? "present" : "MISSING"})`
    );
  }
}

if (adapterParityErrors.length > 0) {
  console.error("Homero self-test failed: Claude/Copilot adapter parity drift detected:");
  for (const error of adapterParityErrors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

run(["init", "--target", targetRoot, "--client", "both", "--project-name", "homero-self-test"], { cliPath: sourceCliPath });

if (!fs.existsSync(copiedCliPath)) {
  console.error(`Expected homero init to copy the CLI itself into the target repo: ${copiedCliPath}`);
  process.exit(1);
}

// The vendored copy is the CLI users actually run. If `init` ever rewrote it on the way in,
// every standalone assertion below would be exercising a different program than the shipped one.
if (Buffer.compare(fs.readFileSync(copiedCliPath), fs.readFileSync(sourceCliPath)) !== 0) {
  console.error(`Expected ${copiedCliPath} to be byte-identical to ${sourceCliPath}`);
  process.exit(1);
}

const stampedConfig = JSON.parse(fs.readFileSync(path.join(targetRoot, "homero.config.json"), "utf8"));

if (stampedConfig.homeroVersion !== homeroVersionConstant || stampedConfig.homeroClient !== "both") {
  console.error(`Expected init to stamp homeroVersion=${homeroVersionConstant} homeroClient=both, got homeroVersion=${stampedConfig.homeroVersion} homeroClient=${stampedConfig.homeroClient}`);
  process.exit(1);
}

// From here on, use the copy `init` placed in the target repo — this is what
// proves Homero is not a devDependency and needs no registry/install step.
activeCliPath = copiedCliPath;

run(["discover", "--target", targetRoot, "--defaults", "--force"]);
run(["validate", "--target", targetRoot, "--client", "both"], { cliPath: sourceCliPath });
runExpectFailure(["validate", "--target", targetRoot, "--client", "both"], { cliPath: copiedCliPath });
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
const featureSpecDir = path.join(featureWorktree, "specs", `FEAT-001-${slugify("Quote form")}`);
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
feature.requirements.uiStates = ["loading", "success", "empty", "email already quoted this month", "server timeout"];
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
fs.writeFileSync(featureConfigPath, `${JSON.stringify(featureConfig, null, 2)}\n`, "utf8");

// --- Negative test: mocks.registered=true is a claim, not proof — the file must really exist ---
const featureWithMissingMock = {
  ...feature,
  contracts: { ...feature.contracts, mocks: { ...feature.contracts.mocks, source: "src/mocks/does-not-exist.ts" } }
};
fs.writeFileSync(featurePath, `${JSON.stringify(featureWithMissingMock, null, 2)}\n`, "utf8");
runExpectFailure(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);

// --- Negative test: requirements.uiStates still the generic starting checklist ---
const featureWithDefaultUiStates = {
  ...feature,
  requirements: { ...feature.requirements, uiStates: ["loading", "success", "empty", "validation-error", "business-error", "server-error"] }
};
fs.writeFileSync(featurePath, `${JSON.stringify(featureWithDefaultUiStates, null, 2)}\n`, "utf8");
runExpectFailure(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);

fs.writeFileSync(featurePath, `${JSON.stringify(feature, null, 2)}\n`, "utf8");

// --- Negative test: plan.md still the unedited specs/_template/plan.md placeholder ---
// feature.json is fully valid at this point — this isolates the plan.md gate (principle 18)
// as the specific reason `feature check` still refuses to pass.
runExpectFailure(["feature", "check", "--target", targetRoot, "--id", "FEAT-001"]);

fillRequiredPlanSections(featureSpecDir);
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

// --- Negative test: maxVerifyAttempts ---
featureConfig.commands.lint = 'node -e "process.exit(1)"';
fs.writeFileSync(featureConfigPath, `${JSON.stringify(featureConfig, null, 2)}\n`, "utf8");

for (let attempt = 1; attempt <= 2; attempt += 1) {
  runExpectFailure(["verify", "--target", targetRoot, "--id", "FEAT-001"]);
}

state = readState();
if (state.phase !== "verify-exhausted" || state.verifyAttempts !== 2) {
  console.error(`Expected phase 'verify-exhausted' with verifyAttempts=2 after 2 failures, got phase=${state.phase} verifyAttempts=${state.verifyAttempts}`);
  process.exit(1);
}

runExpectFailure(["verify", "--target", targetRoot, "--id", "FEAT-001"]);
state = readState();
if (state.verifyAttempts !== 2) {
  console.error(`Expected a 3rd verify call to stay blocked without incrementing further, got verifyAttempts=${state.verifyAttempts}`);
  process.exit(1);
}

// --- Single-adapter install: recorded client, upgrade, catalog ---
// A second target repo, installed with one adapter, because the behavior these assertions
// cover only differs from the "both" default on a single-adapter install.
const singleClientRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-claude-"));
const singleClientConfigPath = path.join(singleClientRoot, "homero.config.json");

run(["init", "--target", singleClientRoot, "--client", "claude", "--project-name", "homero-self-test-claude"], { cliPath: sourceCliPath });

const singleClientConfig = JSON.parse(fs.readFileSync(singleClientConfigPath, "utf8"));

if (singleClientConfig.homeroVersion !== homeroVersionConstant || singleClientConfig.homeroClient !== "claude") {
  console.error(`Expected init to stamp homeroVersion=${homeroVersionConstant} homeroClient=claude, got homeroVersion=${singleClientConfig.homeroVersion} homeroClient=${singleClientConfig.homeroClient}`);
  process.exit(1);
}

// No --client flag on purpose: validate must fall back to the client recorded at install
// time. Defaulting to "both" here failed every claude-only install with a full set of
// bogus "missing .github/**" errors for the adapter it deliberately never installed.
run(["validate", "--target", singleClientRoot], { cliPath: sourceCliPath });

function snapshotTree(root) {
  const files = {};

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(entryPath);
        continue;
      }

      files[path.relative(root, entryPath)] = fs.readFileSync(entryPath).toString("base64");
    }
  }

  walk(root);
  return JSON.stringify(files, Object.keys(files).sort());
}

const treeBeforeDryRun = snapshotTree(singleClientRoot);
run(["upgrade", "--target", singleClientRoot, "--dry-run"], { cliPath: sourceCliPath });

if (snapshotTree(singleClientRoot) !== treeBeforeDryRun) {
  console.error("Expected `homero upgrade --dry-run` to write nothing at all");
  process.exit(1);
}

// The whole promise of upgrade: refresh Homero's own files, touch nothing the team changed.
// --force because this target is a plain directory, not a git checkout — the clean-tree
// guard is a separate concern from the file logic under test here.
const editedConfig = JSON.parse(fs.readFileSync(singleClientConfigPath, "utf8"));
editedConfig.commands.lint = "pnpm run lint:custom";
editedConfig.paths.uiRoot = "app/components";
fs.writeFileSync(singleClientConfigPath, `${JSON.stringify(editedConfig, null, 2)}\n`, "utf8");

const architecturePath = path.join(singleClientRoot, "docs", "homero", "architecture.md");
const handWrittenSection = "## Section the team added by hand";
fs.appendFileSync(architecturePath, `\n${handWrittenSection}\n`, "utf8");

run(["upgrade", "--target", singleClientRoot, "--force"], { cliPath: sourceCliPath });

const upgradedConfig = JSON.parse(fs.readFileSync(singleClientConfigPath, "utf8"));

if (upgradedConfig.commands.lint !== "pnpm run lint:custom") {
  console.error(`Expected upgrade to preserve commands.lint, got ${upgradedConfig.commands.lint}`);
  process.exit(1);
}

if (upgradedConfig.paths.uiRoot !== "app/components") {
  console.error(`Expected upgrade to preserve paths.uiRoot, got ${upgradedConfig.paths.uiRoot}`);
  process.exit(1);
}

if (!fs.readFileSync(architecturePath, "utf8").includes(handWrittenSection)) {
  console.error("Expected upgrade to leave the hand-edited docs/homero/architecture.md in place");
  process.exit(1);
}

if (!fs.existsSync(`${architecturePath}.homero-new`)) {
  console.error("Expected upgrade to write docs/homero/architecture.md.homero-new next to the drifted file");
  process.exit(1);
}

// No node_modules in this target at all: `generate catalog` must say so and exit 0. Failing
// here would break an install over a catalog that is optional by design.
run(["generate", "catalog", "--target", singleClientRoot], { cliPath: path.join(singleClientRoot, "scripts", "homero", "homero.mjs") });

// --- Copilot-only install: the real writeCatalog body, client-aware output paths ---
// Every assertion above with a real installed package used the "claude" or "both" client,
// so writeCatalog's actual markdown-generation body — and the copilot branch of
// catalogOutputPaths specifically — has never run. A copilot-only install with a fake
// tomaco-components package fixes both gaps in one pass.
const copilotClientRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-copilot-"));
const copilotClientConfigPath = path.join(copilotClientRoot, "homero.config.json");
const copilotCliPath = path.join(copilotClientRoot, "scripts", "homero", "homero.mjs");

run(["init", "--target", copilotClientRoot, "--client", "copilot", "--project-name", "homero-self-test-copilot"], { cliPath: sourceCliPath });

const copilotClientConfig = JSON.parse(fs.readFileSync(copilotClientConfigPath, "utf8"));
if (copilotClientConfig.homeroVersion !== homeroVersionConstant || copilotClientConfig.homeroClient !== "copilot") {
  console.error(`Expected init to stamp homeroVersion=${homeroVersionConstant} homeroClient=copilot, got homeroVersion=${copilotClientConfig.homeroVersion} homeroClient=${copilotClientConfig.homeroClient}`);
  process.exit(1);
}

// No --client flag here either, for the same reason as the claude-only assertion above.
run(["validate", "--target", copilotClientRoot], { cliPath: sourceCliPath });

const fakePackageRoot = path.join(copilotClientRoot, "node_modules", "tomaco-components");
fs.mkdirSync(fakePackageRoot, { recursive: true });

function writeFakeTomacoPackage(version) {
  fs.writeFileSync(
    path.join(fakePackageRoot, "package.json"),
    `${JSON.stringify({
      name: "tomaco-components",
      version,
      exports: { ".": { types: "./dist/index.d.ts", import: "./dist/bundle.esm.js" } },
      tomaco: {
        categories: { "Form & Input": ["Button"] },
        components: { Button: { description: "A button.", keywords: ["cta", "action"] } }
      }
    }, null, 2)}\n`,
    "utf8"
  );
  fs.writeFileSync(path.join(fakePackageRoot, "index.d.ts"), "export declare const Button: unknown;\n", "utf8");
}

writeFakeTomacoPackage("1.0.0");

const copilotCatalogPath = path.join(copilotClientRoot, ".github", "instructions", "tomaco-component-api.md");
const claudeCatalogPathOnCopilotInstall = path.join(copilotClientRoot, ".claude", "skills", "tomaco-design-system", "references", "component-api.md");

run(["generate", "catalog", "--target", copilotClientRoot], { cliPath: copilotCliPath });

if (!fs.existsSync(copilotCatalogPath)) {
  console.error(`Expected \`generate catalog\` to write the Copilot catalog at ${copilotCatalogPath}`);
  process.exit(1);
}

const copilotCatalog = fs.readFileSync(copilotCatalogPath, "utf8");
if (!copilotCatalog.includes("GENERATED by `homero generate catalog`") || !copilotCatalog.includes("`Button`") || !copilotCatalog.includes("`1.0.0`")) {
  console.error("Expected the generated Copilot catalog to contain the generated marker, the fake Button component, and its version");
  process.exit(1);
}

// Regression guard: the catalog body used to hardcode a Claude-relative `../SKILL.md` link
// regardless of client, which resolves to a nonexistent .github/SKILL.md on the Copilot side.
if (copilotCatalog.includes("../SKILL.md")) {
  console.error("Expected the generated Copilot catalog to not reference the Claude-only ../SKILL.md path");
  process.exit(1);
}

// A copilot-only install must never write into a .claude/ tree that doesn't exist.
if (fs.existsSync(claudeCatalogPathOnCopilotInstall)) {
  console.error(`Expected a copilot-only install to never write ${claudeCatalogPathOnCopilotInstall}`);
  process.exit(1);
}

// Bump the fake package's version without regenerating: `validate` must warn about drift
// via the per-path loop in warnAboutCatalog, not silently trust the stale file.
writeFakeTomacoPackage("2.0.0");

const staleValidateOutput = runCaptureOutput(["validate", "--target", copilotClientRoot], { cliPath: sourceCliPath });
if (!staleValidateOutput.includes("generated against a different version")) {
  console.error("Expected `validate` to warn that the Copilot catalog was generated against a different version than the installed package");
  process.exit(1);
}

// `upgrade` must both KEEP the generated file (not revert it to the shipped placeholder)
// and refresh it live from node_modules — so after upgrade the catalog should already
// reflect the version-2.0.0 bump above, without a manual `generate catalog` run.
run(["upgrade", "--target", copilotClientRoot, "--force"], { cliPath: sourceCliPath });

const catalogAfterUpgrade = fs.readFileSync(copilotCatalogPath, "utf8");
if (!catalogAfterUpgrade.includes("`2.0.0`")) {
  console.error("Expected `homero upgrade` to refresh the Copilot catalog from node_modules, picking up the version-2.0.0 bump");
  process.exit(1);
}

// --- Mixed discover flags + --defaults ---
// This is the path `homero-coordinator` now uses to run discovery itself from chat: a few
// fields answered explicitly (what it asked the human), everything else defaulted. Only the
// all-defaults path (line 116) had coverage before, which never exercised readArg() picking
// an explicit --<field> value over the default inside the same discover() call.
const discoverMixedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-discover-mixed-"));
run(["init", "--target", discoverMixedRoot, "--client", "both", "--project-name", "homero-self-test-discover-mixed"], { cliPath: sourceCliPath });

const discoverMixedCliPath = path.join(discoverMixedRoot, "scripts", "homero", "homero.mjs");
run([
  "discover",
  "--target", discoverMixedRoot,
  "--framework", "Next.js 14 App Router",
  "--countries", "cl, pe",
  "--defaults"
], { cliPath: discoverMixedCliPath });

const discoverMixedConfig = JSON.parse(fs.readFileSync(path.join(discoverMixedRoot, "homero.config.json"), "utf8"));
if (discoverMixedConfig.stack?.framework !== "Next.js 14 App Router") {
  console.error(`Expected discover to keep the explicit --framework value, got ${discoverMixedConfig.stack?.framework}`);
  process.exit(1);
}
if (discoverMixedConfig.discovery?.countries !== "cl, pe") {
  console.error(`Expected discover to keep the explicit --countries value, got ${discoverMixedConfig.discovery?.countries}`);
  process.exit(1);
}
// formStack was never passed — must have fallen back to the default, proving --defaults still
// covers fields the explicit flags didn't answer, in the same call.
if (!discoverMixedConfig.stack?.forms) {
  console.error("Expected discover --defaults to fill in stack.forms for a field with no explicit flag");
  process.exit(1);
}

const discoverMixedBusinessDoc = fs.readFileSync(path.join(discoverMixedRoot, "docs", "homero", "business.md"), "utf8");
if (!discoverMixedBusinessDoc.includes("cl, pe")) {
  console.error("Expected the explicit --countries value to flow into the generated business.md");
  process.exit(1);
}

// --- run() phase transitions: ready / blocked-only / needs-review, via real `run` calls ---
// FEAT-001 above never empties its task list, never has ALL open tasks blocked at once, and
// never calls a passing `verify` followed by `run` again — so these three runLoop() branches
// were previously only ever reached by mutating state.json directly for other tests, never by
// the command that is actually supposed to produce them.
run([
  "feature", "create",
  "--target", targetRoot,
  "--id", "FEAT-002",
  "--name", "Phase transitions",
  "--figma", "https://www.figma.com/design/example/phases?node-id=1-2",
  "--figma-version", "approved-v1",
  "--contract-mode", "contract-draft",
  "--contract-source", "docs/contracts/phases.openapi.yaml",
  "--countries", "cl"
]);

const phaseFeatureWorktree = path.join(path.resolve(targetRoot, "../.homero-worktrees"), path.basename(targetRoot), "FEAT-002");
const phaseFeatureDir = path.join(phaseFeatureWorktree, "features", "FEAT-002");
const phaseFeaturePath = path.join(phaseFeatureDir, "feature.json");
const phaseFeatureSpecDir = path.join(phaseFeatureWorktree, "specs", `FEAT-002-${slugify("Phase transitions")}`);
const phaseFeatureConfigPath = path.join(phaseFeatureWorktree, "homero.config.json");
const phaseEvidencePath = path.join(phaseFeatureDir, "evidence", "playwright-cli.json");

function readPhaseState() {
  return JSON.parse(fs.readFileSync(path.join(phaseFeatureDir, "state.json"), "utf8"));
}

// Complete the contract (same requirements `feature check` enforces for FEAT-001 above) so
// `run`'s internal featureErrors() check stops rejecting it before ever reaching the phase logic.
const phaseFeature = JSON.parse(fs.readFileSync(phaseFeaturePath, "utf8"));
phaseFeature.status = "ready";
phaseFeature.requirements.acceptanceCriteria = ["The user can see phase transitions work."];
phaseFeature.requirements.uiStates = ["loading", "success", "no transitions to show"];
phaseFeature.contracts.mocks.registered = true;
phaseFeature.contracts.mocks.source = "src/mocks/phases.ts";
fs.mkdirSync(path.join(phaseFeatureWorktree, "src", "mocks"), { recursive: true });
fs.writeFileSync(path.join(phaseFeatureWorktree, "src", "mocks", "phases.ts"), "export const phasesMock = {};\n", "utf8");
fs.writeFileSync(phaseFeaturePath, `${JSON.stringify(phaseFeature, null, 2)}\n`, "utf8");
fillRequiredPlanSections(phaseFeatureSpecDir);

const phaseEvidence = JSON.parse(fs.readFileSync(phaseEvidencePath, "utf8"));
fs.mkdirSync(path.join(phaseFeatureDir, "evidence", "screenshots"), { recursive: true });
fs.mkdirSync(path.join(phaseFeatureDir, "evidence", "snapshots"), { recursive: true });
fs.writeFileSync(path.join(phaseFeatureDir, "evidence", "screenshots", "phases.png"), "test screenshot", "utf8");
fs.writeFileSync(path.join(phaseFeatureDir, "evidence", "snapshots", "phases.yaml"), "test snapshot", "utf8");
phaseEvidence.scenarios = [{
  name: "see phase transitions",
  status: "passed",
  screenshot: "evidence/screenshots/phases.png",
  snapshot: "evidence/snapshots/phases.yaml"
}];
fs.writeFileSync(phaseEvidencePath, `${JSON.stringify(phaseEvidence, null, 2)}\n`, "utf8");

const phaseFeatureConfig = JSON.parse(fs.readFileSync(phaseFeatureConfigPath, "utf8"));
phaseFeatureConfig.commands = { lint: "node --version", typecheck: "node --version", test: "node --version", e2e: "node --version" };
fs.writeFileSync(phaseFeatureConfigPath, `${JSON.stringify(phaseFeatureConfig, null, 2)}\n`, "utf8");

run(["feature", "check", "--target", targetRoot, "--id", "FEAT-002"]);

// "ready": zero tasks.
run(["run", "--target", targetRoot, "--id", "FEAT-002"]);
let phaseState = readPhaseState();
if (phaseState.phase !== "ready") {
  console.error(`Expected phase 'ready' with zero tasks, got ${phaseState.phase}`);
  process.exit(1);
}

// "blocked": the only task hits maxAttemptsPerTask and becomes permanently blocked, with no
// pending/in-progress sibling task left — the precondition runLoop()'s blockedOnly branch needs.
run(["task", "add", "--target", targetRoot, "--id", "FEAT-002", "--title", "Only task"]);
run(["run", "--target", targetRoot, "--id", "FEAT-002"]);

phaseState = readPhaseState();
phaseState.limits.maxAttemptsPerTask = 1;
const onlyTask = phaseState.tasks.find(task => task.id === "T-001");
onlyTask.status = "in-progress";
onlyTask.attempts = 0;
phaseState.activeTaskId = onlyTask.id;
fs.writeFileSync(path.join(phaseFeatureDir, "state.json"), `${JSON.stringify(phaseState, null, 2)}\n`, "utf8");

runExpectFailure(["task", "block", "--target", targetRoot, "--id", "FEAT-002", "--task", "T-001", "--reason", "blocked for good"]);
phaseState = readPhaseState();
if (phaseState.tasks[0].status !== "blocked") {
  console.error(`Expected T-001 to be permanently blocked after exceeding maxAttemptsPerTask, got ${phaseState.tasks[0].status}`);
  process.exit(1);
}

run(["run", "--target", targetRoot, "--id", "FEAT-002"]);
phaseState = readPhaseState();
if (phaseState.phase !== "blocked") {
  console.error(`Expected phase 'blocked' when the only task is blocked, got ${phaseState.phase}`);
  process.exit(1);
}

// "needs-review": unblock and complete the only task, let `run` land on "verifying", pass a real
// `verify`, then call `run` again — that second call is what actually reads the passed receipt.
phaseState = readPhaseState();
phaseState.limits.maxAttemptsPerTask = 3;
const unblockedTask = phaseState.tasks.find(task => task.id === "T-001");
unblockedTask.status = "in-progress";
phaseState.activeTaskId = unblockedTask.id;
fs.writeFileSync(path.join(phaseFeatureDir, "state.json"), `${JSON.stringify(phaseState, null, 2)}\n`, "utf8");

run(["task", "verify", "--target", targetRoot, "--id", "FEAT-002", "--task", "T-001", "--summary", "done"]);
run(["run", "--target", targetRoot, "--id", "FEAT-002"]);
phaseState = readPhaseState();
if (phaseState.phase !== "verifying") {
  console.error(`Expected phase 'verifying' once the only task is done, got ${phaseState.phase}`);
  process.exit(1);
}

run(["verify", "--target", targetRoot, "--id", "FEAT-002"]);
run(["run", "--target", targetRoot, "--id", "FEAT-002"]);
phaseState = readPhaseState();
if (phaseState.phase !== "needs-review") {
  console.error(`Expected phase 'needs-review' after run() saw a passed receipt, got ${phaseState.phase}`);
  process.exit(1);
}

const phaseFeatureAfter = JSON.parse(fs.readFileSync(phaseFeaturePath, "utf8"));
if (phaseFeatureAfter.status !== "needs-review") {
  console.error(`Expected feature.json status 'needs-review', got ${phaseFeatureAfter.status}`);
  process.exit(1);
}

// --- Single-adapter install: full feature lifecycle on copilot-only ---
// Everything above exercises feature create/check/run/task/verify only against the --client
// both targetRoot. A copilot-only install never got this coverage — only init/validate/
// generate-catalog/upgrade did — so a regression specific to the copilot-only path (e.g. a
// template file only the "both"/"claude" adapters ship) could ship unnoticed.
spawnSync("git", ["init"], { cwd: copilotClientRoot, stdio: "inherit" });
spawnSync("git", ["add", "."], { cwd: copilotClientRoot, stdio: "inherit" });
spawnSync(
  "git",
  ["-c", "user.name=Homero Test", "-c", "user.email=homero@example.test", "commit", "-m", "chore: install homero"],
  { cwd: copilotClientRoot, stdio: "inherit" }
);

run([
  "feature", "create",
  "--target", copilotClientRoot,
  "--id", "FEAT-900",
  "--name", "Copilot-only lifecycle",
  "--figma", "https://www.figma.com/design/example/copilot?node-id=1-2",
  "--figma-version", "approved-v1",
  "--contract-mode", "contract-draft",
  "--contract-source", "docs/contracts/copilot.openapi.yaml",
  "--countries", "cl"
], { cliPath: copilotCliPath });

const copilotFeatureWorktree = path.join(path.resolve(copilotClientRoot, "../.homero-worktrees"), path.basename(copilotClientRoot), "FEAT-900");
const copilotFeatureDir = path.join(copilotFeatureWorktree, "features", "FEAT-900");
const copilotFeaturePath = path.join(copilotFeatureDir, "feature.json");
const copilotFeatureSpecDir = path.join(copilotFeatureWorktree, "specs", `FEAT-900-${slugify("Copilot-only lifecycle")}`);
const copilotFeatureConfigPath = path.join(copilotFeatureWorktree, "homero.config.json");
const copilotEvidencePath = path.join(copilotFeatureDir, "evidence", "playwright-cli.json");

const copilotFeature = JSON.parse(fs.readFileSync(copilotFeaturePath, "utf8"));
copilotFeature.status = "ready";
copilotFeature.requirements.acceptanceCriteria = ["The user can complete the copilot-only lifecycle."];
copilotFeature.requirements.uiStates = ["loading", "success", "copilot-only edge case"];
copilotFeature.contracts.mocks.registered = true;
copilotFeature.contracts.mocks.source = "src/mocks/copilot.ts";
fs.mkdirSync(path.join(copilotFeatureWorktree, "src", "mocks"), { recursive: true });
fs.writeFileSync(path.join(copilotFeatureWorktree, "src", "mocks", "copilot.ts"), "export const copilotMock = {};\n", "utf8");
fs.writeFileSync(copilotFeaturePath, `${JSON.stringify(copilotFeature, null, 2)}\n`, "utf8");
fillRequiredPlanSections(copilotFeatureSpecDir);

const copilotFeatureEvidence = JSON.parse(fs.readFileSync(copilotEvidencePath, "utf8"));
fs.mkdirSync(path.join(copilotFeatureDir, "evidence", "screenshots"), { recursive: true });
fs.mkdirSync(path.join(copilotFeatureDir, "evidence", "snapshots"), { recursive: true });
fs.writeFileSync(path.join(copilotFeatureDir, "evidence", "screenshots", "copilot.png"), "test screenshot", "utf8");
fs.writeFileSync(path.join(copilotFeatureDir, "evidence", "snapshots", "copilot.yaml"), "test snapshot", "utf8");
copilotFeatureEvidence.scenarios = [{
  name: "complete the copilot-only lifecycle",
  status: "passed",
  screenshot: "evidence/screenshots/copilot.png",
  snapshot: "evidence/snapshots/copilot.yaml"
}];
fs.writeFileSync(copilotEvidencePath, `${JSON.stringify(copilotFeatureEvidence, null, 2)}\n`, "utf8");

const copilotFeatureConfig = JSON.parse(fs.readFileSync(copilotFeatureConfigPath, "utf8"));
copilotFeatureConfig.commands = { lint: "node --version", typecheck: "node --version", test: "node --version", e2e: "node --version" };
fs.writeFileSync(copilotFeatureConfigPath, `${JSON.stringify(copilotFeatureConfig, null, 2)}\n`, "utf8");

run(["feature", "check", "--target", copilotClientRoot, "--id", "FEAT-900"], { cliPath: copilotCliPath });
run(["task", "add", "--target", copilotClientRoot, "--id", "FEAT-900", "--title", "Build the copilot-only screen"], { cliPath: copilotCliPath });
run(["run", "--target", copilotClientRoot, "--id", "FEAT-900"], { cliPath: copilotCliPath });
run(["task", "verify", "--target", copilotClientRoot, "--id", "FEAT-900", "--task", "T-001", "--summary", "done"], { cliPath: copilotCliPath });
run(["verify", "--target", copilotClientRoot, "--id", "FEAT-900"], { cliPath: copilotCliPath });

const copilotReceiptsDir = path.join(copilotFeatureDir, "receipts");
if (!fs.existsSync(copilotReceiptsDir) || fs.readdirSync(copilotReceiptsDir).length === 0) {
  console.error("Expected a verification receipt for the copilot-only feature");
  process.exit(1);
}

run(["run", "--target", copilotClientRoot, "--id", "FEAT-900"], { cliPath: copilotCliPath });
const copilotFeatureAfter = JSON.parse(fs.readFileSync(copilotFeaturePath, "utf8"));
if (copilotFeatureAfter.status !== "needs-review") {
  console.error(`Expected feature.json status 'needs-review' on a copilot-only install, got ${copilotFeatureAfter.status}`);
  process.exit(1);
}

// --- upgrade: UPDATE and ADD branches on an ordinary managed file ---
// Every upgrade run above only ever produced "unchanged", "user" (conflict), or "generated"
// (keep) results — nothing under test ever actually differed from the shipped template, so the
// core "refresh a changed file" (UPDATE) and "install a file that didn't exist yet" (ADD)
// branches were never exercised with a real content difference.
const ordinaryManagedFile = path.join(copilotClientRoot, ".github", "agents", "homero-reviewer.agent.md");
fs.writeFileSync(ordinaryManagedFile, "corrupted content that will never match the shipped template\n", "utf8");
run(["upgrade", "--target", copilotClientRoot, "--force"], { cliPath: sourceCliPath });

if (fs.readFileSync(ordinaryManagedFile, "utf8").includes("corrupted content")) {
  console.error("Expected `upgrade` to UPDATE an ordinary managed file back to the shipped template");
  process.exit(1);
}

fs.rmSync(ordinaryManagedFile);
run(["upgrade", "--target", copilotClientRoot, "--force"], { cliPath: sourceCliPath });

if (!fs.existsSync(ordinaryManagedFile)) {
  console.error("Expected `upgrade` to ADD back a managed file that was deleted");
  process.exit(1);
}

// --- upgrade: unmanaged team-owned AGENTS.md triggers .homero-new, not an overwrite ---
// The only conflict case ever tested before was a discover-authored doc drifting (userOwnedFiles);
// the claimableFiles path (AGENTS.md/CLAUDE.md/.github/copilot-instructions.md written by a team
// BEFORE installing Homero, with no `homero:managed` marker) was never exercised at all.
const unmanagedRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-unmanaged-"));
fs.mkdirSync(unmanagedRoot, { recursive: true });
fs.writeFileSync(path.join(unmanagedRoot, "AGENTS.md"), "# Our own team instructions\nNo Homero marker here.\n", "utf8");

run(["init", "--target", unmanagedRoot, "--client", "claude", "--project-name", "homero-self-test-unmanaged"], { cliPath: sourceCliPath });

if (!fs.readFileSync(path.join(unmanagedRoot, "AGENTS.md"), "utf8").includes("No Homero marker here.")) {
  console.error("Expected `init` to skip an existing unmarked AGENTS.md rather than overwrite it");
  process.exit(1);
}

run(["upgrade", "--target", unmanagedRoot, "--force"], { cliPath: sourceCliPath });

if (!fs.existsSync(path.join(unmanagedRoot, "AGENTS.md.homero-new"))) {
  console.error("Expected `upgrade` to write AGENTS.md.homero-new next to an unmarked, team-owned AGENTS.md");
  process.exit(1);
}

if (!fs.readFileSync(path.join(unmanagedRoot, "AGENTS.md"), "utf8").includes("No Homero marker here.")) {
  console.error("Expected `upgrade` to leave the team's own AGENTS.md untouched");
  process.exit(1);
}

// --- setup graphify (only setup playwright had any coverage before) ---
run(["setup", "graphify", "--target", targetRoot, "--dry-run"]);

// --- generate form: collision guard (SKIP without --force) and --force override ---
const formCollisionOutput = runCaptureOutput(["generate", "form", "--target", targetRoot, "--name", "UserInfoForm", "--country", "cl"]);
if (!formCollisionOutput.includes("SKIP")) {
  console.error("Expected a second `generate form` for the same name/country to SKIP the existing files without --force");
  process.exit(1);
}

fs.writeFileSync(generatedForm, "// stale placeholder, should be overwritten by --force\n", "utf8");
run(["generate", "form", "--target", targetRoot, "--name", "UserInfoForm", "--country", "cl", "--force"]);
if (fs.readFileSync(generatedForm, "utf8").includes("stale placeholder")) {
  console.error("Expected `generate form --force` to overwrite an existing file");
  process.exit(1);
}

// --- homero version: normal output and the drift warning ---
const versionOutput = runCaptureOutput(["version", "--target", targetRoot], { cliPath: sourceCliPath });
if (!versionOutput.includes(homeroVersionConstant)) {
  console.error("Expected `homero version --target` to report the current version");
  process.exit(1);
}

const versionConfigPath = path.join(targetRoot, "homero.config.json");
const originalVersionConfig = fs.readFileSync(versionConfigPath, "utf8");
const driftedConfig = JSON.parse(originalVersionConfig);
driftedConfig.homeroVersion = "0.0.1";
fs.writeFileSync(versionConfigPath, `${JSON.stringify(driftedConfig, null, 2)}\n`, "utf8");

const driftOutput = runCaptureOutput(["version", "--target", targetRoot], { cliPath: sourceCliPath });
if (!driftOutput.toUpperCase().includes("WARN")) {
  console.error("Expected `homero version` to warn when homero.config.json's homeroVersion drifts from the vendored CLI");
  process.exit(1);
}

fs.writeFileSync(versionConfigPath, originalVersionConfig, "utf8");

// --- discover: SKIP branch (re-run without --force) and --force overwrite branch ---
const discoverSkipOutput = runCaptureOutput(["discover", "--target", discoverMixedRoot, "--defaults"], { cliPath: discoverMixedCliPath });
if (!discoverSkipOutput.includes("SKIP") || !discoverSkipOutput.includes("already discovered")) {
  console.error("Expected a second `discover` run without --force to SKIP the already-discovered docs");
  process.exit(1);
}

run(["discover", "--target", discoverMixedRoot, "--countries", "pe", "--defaults", "--force"], { cliPath: discoverMixedCliPath });
const forcedBusinessDoc = fs.readFileSync(path.join(discoverMixedRoot, "docs", "homero", "business.md"), "utf8");
if (!forcedBusinessDoc.includes("Countries or variants: pe")) {
  console.error("Expected `discover --force` to overwrite an already-discovered doc with the new answers");
  process.exit(1);
}

// --- task verify/block edge-guard branches ---
// T-001 on FEAT-002 is "done" by this point (the phase-transition block above completed it).
// Verifying an already-done task is an idempotent no-op (exit 0, informational message), not a
// failure — only blocking an already-done task is rejected.
run(["task", "verify", "--target", targetRoot, "--id", "FEAT-002", "--task", "T-001", "--summary", "already done"]);
runExpectFailure(["task", "block", "--target", targetRoot, "--id", "FEAT-002", "--task", "T-001", "--reason", "already done"]);

phaseState = readPhaseState();
phaseState.tasks[0].status = "blocked";
fs.writeFileSync(path.join(phaseFeatureDir, "state.json"), `${JSON.stringify(phaseState, null, 2)}\n`, "utf8");
runExpectFailure(["task", "verify", "--target", targetRoot, "--id", "FEAT-002", "--task", "T-001", "--summary", "trying anyway"]);

// --- model-pin validation branches ---
const modelPinConfigPath = path.join(targetRoot, "homero.config.json");
const originalModelPinConfig = fs.readFileSync(modelPinConfigPath, "utf8");
const modelPinConfig = JSON.parse(originalModelPinConfig);

modelPinConfig.agents.models.claude["homero-coordinator"] = "gpt-4";
fs.writeFileSync(modelPinConfigPath, `${JSON.stringify(modelPinConfig, null, 2)}\n`, "utf8");
runExpectFailure(["validate", "--target", targetRoot, "--client", "both"], { cliPath: sourceCliPath });

modelPinConfig.agents.models.claude["homero-coordinator"] = "sonnet";
modelPinConfig.agents.models.claude["not-a-real-role"] = "opus";
fs.writeFileSync(modelPinConfigPath, `${JSON.stringify(modelPinConfig, null, 2)}\n`, "utf8");
const modelPinWarnOutput = runCaptureOutput(["validate", "--target", targetRoot, "--client", "both"], { cliPath: sourceCliPath });
if (!modelPinWarnOutput.includes("WARN") || !modelPinWarnOutput.includes("not-a-real-role")) {
  console.error("Expected `validate` to WARN about a model pin for an agent role that does not exist");
  process.exit(1);
}

fs.writeFileSync(modelPinConfigPath, originalModelPinConfig, "utf8");

// --- monorepo: --target pointing at a nested app folder, not the git repo root ---
const monorepoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "homero-self-test-monorepo-"));
const monorepoAppRoot = path.join(monorepoRoot, "apps", "web");
fs.mkdirSync(monorepoAppRoot, { recursive: true });
spawnSync("git", ["init"], { cwd: monorepoRoot, stdio: "inherit" });
fs.writeFileSync(path.join(monorepoRoot, "README.md"), "# monorepo\n", "utf8");
spawnSync("git", ["add", "."], { cwd: monorepoRoot, stdio: "inherit" });
spawnSync(
  "git",
  ["-c", "user.name=Homero Test", "-c", "user.email=homero@example.test", "commit", "-m", "chore: monorepo root"],
  { cwd: monorepoRoot, stdio: "inherit" }
);

run(["init", "--target", monorepoAppRoot, "--client", "claude", "--project-name", "homero-self-test-monorepo-web"], { cliPath: sourceCliPath });
const monorepoAppCliPath = path.join(monorepoAppRoot, "scripts", "homero", "homero.mjs");
run(["discover", "--target", monorepoAppRoot, "--defaults", "--force"], { cliPath: monorepoAppCliPath });

fs.writeFileSync(path.join(monorepoAppRoot, "package.json"), `${JSON.stringify({ name: "web", private: true }, null, 2)}\n`, "utf8");
spawnSync("git", ["add", "."], { cwd: monorepoRoot, stdio: "inherit" });
spawnSync(
  "git",
  ["-c", "user.name=Homero Test", "-c", "user.email=homero@example.test", "commit", "-m", "chore: install homero in apps/web"],
  { cwd: monorepoRoot, stdio: "inherit" }
);

run([
  "feature", "create",
  "--target", monorepoAppRoot,
  "--id", "FEAT-M01",
  "--name", "Monorepo feature",
  "--figma", "https://www.figma.com/design/example/monorepo?node-id=1-2",
  "--figma-version", "approved-v1",
  "--contract-mode", "contract-draft",
  "--contract-source", "docs/contracts/monorepo.openapi.yaml",
  "--countries", "cl"
], { cliPath: monorepoAppCliPath });

const expectedMonorepoWorktree = path.join(monorepoRoot, "apps", ".homero-worktrees", "web", "FEAT-M01");
if (!fs.existsSync(path.join(expectedMonorepoWorktree, "features", "FEAT-M01", "feature.json"))) {
  console.error(`Expected the monorepo feature worktree at ${expectedMonorepoWorktree}, resolved relative to the app folder, not the monorepo root`);
  process.exit(1);
}

console.log(`Homero self-test OK: ${targetRoot}`);