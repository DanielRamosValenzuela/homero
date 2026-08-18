#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);
const validClients = new Set(["copilot", "claude", "both"]);
const textExtensions = new Set([
  ".md",
  ".json",
  ".mjs",
  ".js",
  ".ts",
  ".tsx",
  ".txt"
]);

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(currentDir, "../../..");

// Identity of this CLI file, including the copy vendored into a target repo at
// scripts/homero/homero.mjs. `homero upgrade` compares it against the installed
// homeroVersion to decide what to refresh. Kept in lockstep with package.json by
// scripts/self-test.mjs — bump both together.
const homeroVersion = "0.15.0";

function readArg(name) {
  const index = commandArgs.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return commandArgs[index + 1];
}

function hasFlag(name) {
  // args is [command, ...commandArgs] by construction (line 10-12), so commandArgs is
  // always a subset of args — checking args alone is sufficient.
  return args.includes(name);
}

// Shared by every command whose only required args are --target/--id (featureCheckCommand,
// verifyFeature, runLoop, taskStatus): print usage and exit 0 for --help, exit 1 if either
// is missing.
function requireTargetAndId(targetArg, id) {
  if (!targetArg || !id || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id ? 0 : 1);
  }
}

function usage() {
  console.log(`Install (run once, in your repo root):
  npx github:DanielRamosValenzuela/homero

That defaults to \`init --target . --client both\` and copies the CLI to
scripts/homero/homero.mjs. Every command below except init/upgrade/validate
then runs from that copy: \`node scripts/homero/homero.mjs <command> ...\`.
\`init\`/\`upgrade\`/\`validate\` need the Homero source templates, so they run via
\`npx github:DanielRamosValenzuela/homero <command> ...\` instead.

To update an existing install, use \`upgrade\` — not \`init --force\`. It refreshes
Homero-managed files, leaves your docs and config values alone, and adds any new
config keys. Preview it with --dry-run.

Usage:
  homero init [--target <repo>] [--client <copilot|claude|both>] [--project-name <name>] [--force]
  homero upgrade [--target <repo>] [--client <copilot|claude|both>] [--dry-run] [--force]
  homero version [--target <repo>]
  homero discover --target <repo> [--defaults] [--force] [--<field> <value> ...]
  homero validate [--target <repo>] [--client <copilot|claude|both>]
  homero generate form --target <repo> --name <FormName> --country <cl|pe|co> [--force]
  homero generate catalog [--target <repo>] [--package <specifier>]
  homero feature create --target <repo> --id <id> --name <name> --figma <url> --figma-version <version> --contract-mode <contract-first|contract-draft|no-backend-exception> --countries <cl|cl,pe,...> [--contract-source <source>] [--contract-exception <reason>]
  homero feature check --target <repo> --id <id>
  homero verify --target <repo> --id <id>
  homero run --target <repo> --id <id> [--json]
  homero task add --target <repo> --id <id> --title <title> [--paths <path,...>]
  homero task verify --target <repo> --id <id> --task <task-id> --summary <summary>
  homero task block --target <repo> --id <id> --task <task-id> --reason <reason>
  homero task status --target <repo> --id <id> [--json]
  homero setup playwright --target <repo> [--dry-run]
  homero setup graphify --target <repo> [--dry-run]

\`discover\`'s [--<field> <value> ...] answers any of its ~35 questions by flag
(--framework, --formStack, --countries, --contractMode, and so on) instead of
the interactive prompt — --defaults fills in whatever you didn't answer. See
docs/homero/ai-workflow.md's discover section (in an installed repo) for the
full field list and an example.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function replaceTokens(content, projectName, extra = {}) {
  let output = content.replaceAll("__PROJECT_NAME__", projectName);

  for (const [token, value] of Object.entries(extra)) {
    // An empty value erases the whole line rather than leaving a bare key behind: a
    // dangling `model:` is a malformed value on Claude Code and can break the YAML
    // frontmatter on Copilot, which then skips the agent file entirely and silently.
    output = value
      ? output.replaceAll(token, value)
      : output.replace(new RegExp(`^${token}\\r?\\n`, "gm"), "");
  }

  return output;
}

// Resolves the frontmatter `model:` line for one agent file, or "" to omit it.
//
// Keyed off the DESTINATION PATH, not the --client flag: a `--client both` install writes
// both trees in one run, and keying off the flag would drop a Claude alias like `opus`
// into a Copilot agent file, where it does not resolve.
function agentModelLine(relativePath, config) {
  const client = relativePath.startsWith(".claude")
    ? "claude"
    : relativePath.startsWith(path.join(".github", "agents"))
      ? "copilot"
      : null;

  if (!client) {
    return "";
  }

  const role = path.basename(relativePath).replace(/\.agent\.md$|\.md$/, "");
  const pinned = config?.agents?.models?.[client]?.[role];

  return typeof pinned === "string" && pinned.trim() ? `model: ${pinned.trim()}` : "";
}

function copyRecursive(sourceDir, destinationDir, options) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyRecursive(sourcePath, destinationPath, options);
      continue;
    }

    if (!options.force && fs.existsSync(destinationPath)) {
      options.summary.skipped += 1;
      console.log(`SKIP ${destinationPath}`);
      continue;
    }

    const existed = fs.existsSync(destinationPath);
    const extension = path.extname(entry.name).toLowerCase();
    const content = fs.readFileSync(sourcePath);

    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });

    if (textExtensions.has(extension) || entry.name === "AGENTS.md" || entry.name === "CLAUDE.md") {
      const relativePath = path.relative(options.targetRoot, destinationPath);
      // __PROJECT_NAME__ sits inside a JSON string literal in homero.config.json — a raw
      // substitution would break the JSON if the project name itself contains a quote or
      // backslash. JSON.stringify(...).slice(1, -1) gives the same escaped text JSON.stringify
      // would put between the quotes that are already in the template.
      const tokenSafeProjectName =
        extension === ".json" ? JSON.stringify(options.projectName).slice(1, -1) : options.projectName;
      fs.writeFileSync(
        destinationPath,
        replaceTokens(content.toString("utf8"), tokenSafeProjectName, {
          __HOMERO_MODEL__: agentModelLine(relativePath, options.modelConfig)
        }),
        "utf8"
      );
    } else {
      fs.writeFileSync(destinationPath, content);
    }

    if (existed) {
      options.summary.overwritten += 1;
      console.log(`OVERWRITE ${destinationPath}`);
    } else {
      options.summary.created += 1;
      console.log(`CREATE ${destinationPath}`);
    }
  }
}

function listFiles(rootDir, baseDir = rootDir) {
  const files = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...listFiles(entryPath, baseDir));
      continue;
    }

    files.push(path.relative(baseDir, entryPath));
  }

  return files;
}

function templateRootsForClient(client) {
  const roots = [path.join(repoRoot, "templates", "core")];

  if (client === "copilot" || client === "both") {
    roots.push(path.join(repoRoot, "templates", "copilot"));
  }

  if (client === "claude" || client === "both") {
    roots.push(path.join(repoRoot, "templates", "claude"));
  }

  return roots;
}

function validateClient(client) {
  if (!validClients.has(client)) {
    fail(`Invalid client: ${client}. Use copilot, claude, or both.`);
  }
}

// The generated Tomaco catalog has one home per installed client: the Claude skill
// keeps its own references/ file, Copilot has no references/ convention so its copy
// sits flat next to the other .instructions.md files. `client` defaults to "both"
// the same way validate/upgrade already do for repos that predate homeroClient.
function catalogOutputPaths(targetRoot, client) {
  const paths = [];

  if (client === "claude" || client === "both") {
    paths.push(
      path.join(targetRoot, ".claude", "skills", "tomaco-design-system", "references", "component-api.md")
    );
  }

  if (client === "copilot" || client === "both") {
    paths.push(path.join(targetRoot, ".github", "instructions", "tomaco-component-api.md"));
  }

  return paths;
}

function isSourceRepo() {
  // repoRoot is currentDir/../../.. — correct for packages/cli/bin/homero.mjs in the
  // Homero source tree, but from a vendored scripts/homero/homero.mjs it resolves to the
  // PARENT of the target repo. Checking only for templates/ there would let an unrelated
  // sibling directory masquerade as Homero and copy arbitrary files into a user's repo.
  if (!fs.existsSync(path.join(repoRoot, "templates", "core"))) {
    return false;
  }

  if (!fs.existsSync(path.join(repoRoot, "packages", "cli", "bin", "homero.mjs"))) {
    return false;
  }

  const manifestPath = path.join(repoRoot, "package.json");

  if (!fs.existsSync(manifestPath)) {
    return false;
  }

  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8")).name === "homero";
  } catch {
    return false;
  }
}

function assertSourceRepo(commandName) {
  if (!isSourceRepo()) {
    fail(
      `homero ${commandName} needs the Homero source templates, which aren't available from a locally copied scripts/homero/homero.mjs. Run it via \`npx github:DanielRamosValenzuela/homero ${commandName} ...\` instead.`
    );
  }
}

function readConfig(targetRoot) {
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

  // readJsonFile, not raw JSON.parse: a hand-corrupted config used to surface as a clean
  // "homero.config.json is not valid JSON: ..." message, and a bare parse turns every
  // caller (validate, version, generate catalog, upgrade) into an uncaught stack trace.
  return readJsonFile(configPath, "homero.config.json");
}

function writeJsonFile(filePath, value) {
  // Temp file + rename, not a direct writeFileSync: state.json/feature.json get rewritten on
  // every `run`/`task verify`/`task block`/`verify` call mid agentic loop, and a process killed
  // mid-write would otherwise leave truncated JSON that crashes every later command against
  // that feature with no recovery path. Same reasoning as the CLI's own vendored-copy update.
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.homero-tmp`;
  fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(temporaryPath, filePath);
}

function readJsonFile(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${description} is not valid JSON: ${error.message}`);
  }
}

function projectNameFromConfig(targetRoot, config) {
  return config.projectName || path.basename(targetRoot);
}

// Every discover-generated doc carries this line; none of the shipped templates do. That
// makes it a clean test for "has this doc been through discover yet?".
const discoveredMarker = "Generated by `homero discover`.";

// `init` always creates the five docs from templates, so gating discover's writes on
// --force the way a plain create-if-missing/skip-if-force-absent write would meant
// discover updated the config and left the docs describing the generic default stack —
// architecture.md claiming src/ui while homero.config.json said app/components. Replace
// an untouched template freely; never silently overwrite a doc that discover already
// produced and a human may have edited.
function writeDiscoveredDoc(targetRoot, relativePath, content, force) {
  const destinationPath = path.join(targetRoot, relativePath);

  if (!fs.existsSync(destinationPath)) {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    fs.writeFileSync(destinationPath, content, "utf8");
    console.log(`CREATE ${destinationPath}`);
    return;
  }

  if (!force && fs.readFileSync(destinationPath, "utf8").includes(discoveredMarker)) {
    console.log(`SKIP ${destinationPath} (already discovered — re-run with --force to regenerate)`);
    return;
  }

  fs.writeFileSync(destinationPath, content, "utf8");
  console.log(`WRITE ${destinationPath}`);
}

// Sniffs the real lockfile before trusting the init-time template default (`pnpm`) — a repo
// that already has a package-lock.json/yarn.lock is unambiguous ground truth, the same
// "read the real repo instead of guessing" philosophy as generate catalog reading the
// installed package instead of memory.
function detectPackageManager(targetRoot, config) {
  if (fs.existsSync(path.join(targetRoot, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (fs.existsSync(path.join(targetRoot, "yarn.lock"))) {
    return "yarn";
  }

  if (fs.existsSync(path.join(targetRoot, "package-lock.json"))) {
    return "npm";
  }

  return config.packageManager || "pnpm";
}

function defaultCommandsForPackageManager(packageManager) {
  switch (packageManager) {
    case "npm":
      return { lint: "npm run lint", typecheck: "npx tsc --noEmit", test: "npm test", e2e: "npx playwright test" };
    case "yarn":
      return { lint: "yarn lint", typecheck: "yarn tsc --noEmit", test: "yarn test", e2e: "yarn playwright test" };
    case "pnpm":
    default:
      return { lint: "pnpm lint", typecheck: "pnpm exec tsc --noEmit", test: "pnpm test", e2e: "pnpm exec playwright test" };
  }
}

function discoveryDefaults(targetRoot, config) {
  const packageManager = detectPackageManager(targetRoot, config);
  const defaultCommands = defaultCommandsForPackageManager(packageManager);
  // The init-time template always ships pnpm-flavored commands.lint/etc, even in a repo
  // discover just detected as npm/yarn — so "config.commands.lint is set" doesn't mean a
  // human chose it. Only treat it as a real override if it differs from that untouched
  // template value; otherwise defer to the detected package manager's own default.
  const templateCommands = defaultCommandsForPackageManager("pnpm");
  const commandOrDefault = (configured, key) =>
    configured && configured !== templateCommands[key] ? configured : defaultCommands[key];

  return {
    projectName: projectNameFromConfig(targetRoot, config),
    projectStatus: "existing frontend repo",
    monorepo: config.discovery?.monorepo || "no",
    framework: "Next.js App Router",
    runtime: "Node.js",
    packageManager,
    formStack: "React Hook Form + Zod",
    designSystem: "Tomaco",
    designSystemPackage: config.product?.designSystemPackage || "tomaco-components",
    stylingException: "none",
    lintGuardrail: config.lintGuardrail || "yes",
    dataStack: "TanStack Query for reads and Server Actions for writes",
    stateStack: "Zustand only for cross-step client state",
    uiRoot: config.paths?.uiRoot || "src/ui",
    stepRoot: config.paths?.stepRoot || "src/app",
    serverActionsRoot: config.paths?.serverActionsRoot || "src/actions",
    storesRoot: config.paths?.storesRoot || "src/store",
    widgetsRoot: config.paths?.widgetsRoot || "src/widgets",
    testRoot: config.paths?.testRoot || "test",
    countries: "cl, pe, co",
    figmaSource: "TBD",
    contractMode: config.contracts?.mode || "contract-draft",
    contractFormat: config.contracts?.format || "examples",
    contractSource: config.contracts?.source || "TBD",
    mockStrategy: config.contracts?.mockStrategy || "fixtures",
    mockLocation: config.contracts?.mockLocation || "src/mocks",
    mockStates: config.contracts?.states || "success, loading, empty, validation error, business error, network/server error",
    sensitiveDataPolicy: config.contracts?.sensitiveDataPolicy || "anonymized-only",
    businessGoal: "TBD",
    successState: "TBD",
    stakeholders: "TBD",
    lintCommand: commandOrDefault(config.commands?.lint, "lint"),
    typecheckCommand: commandOrDefault(config.commands?.typecheck, "typecheck"),
    testCommand: commandOrDefault(config.commands?.test, "test"),
    e2eCommand: commandOrDefault(config.commands?.e2e, "e2e")
  };
}

const discoveryFields = [
  ["projectName", "Project name"],
  ["projectStatus", "Project status: new starter, existing repo, or brownfield migration"],
  ["monorepo", "Is this repo a monorepo? If yes, run `homero init`/`discover` again per app with --target pointing at that app's folder (e.g. apps/web), not the workspace root"],
  ["framework", "Framework/runtime stack"],
  ["runtime", "Runtime"],
  ["packageManager", "Package manager: npm, pnpm, or yarn — detected from the repo's lockfile when present, ask only if none exists yet"],
  ["formStack", "Form stack"],
  ["designSystem", "Design system"],
  ["designSystemPackage", "Design system npm package specifier, as imported in code (e.g. tomaco-components)"],
  ["stylingException", "Styling exception, if any"],
  ["lintGuardrail", "Enforce the 'use client' lint guardrail? (yes/no) — yes makes `homero validate` warn until homero.eslint.config.mjs is imported by your eslint.config.js"],
  ["dataStack", "Data fetching and write stack"],
  ["stateStack", "Client state stack"],
  ["uiRoot", "UI/forms root path, relative to --target (default src/ui)"],
  ["stepRoot", "Step/route root path, relative to --target (default src/app)"],
  ["serverActionsRoot", "Server actions/transport root path, relative to --target (default src/actions)"],
  ["storesRoot", "Client state store root path, relative to --target (default src/store)"],
  ["widgetsRoot", "Shared cross-step widgets root path, relative to --target (default src/widgets)"],
  ["testRoot", "Test root path, relative to --target (default test)"],
  ["countries", "Countries or variants in scope"],
  ["figmaSource", "Figma workspace/team convention, if any (e.g. a Figma team URL) — NOT a specific screen's link. Per-screen Figma URLs are provided per feature, in /homero-plan, not here — TBD is a fine answer"],
  ["contractMode", "Backend contract mode: contract-first, contract-draft, or no-backend-exception"],
  ["contractFormat", "Backend contract format: openapi, json-schema, examples, postman, curl, manual, or none"],
  ["contractSource", "Backend contract source: path, URL, ticket, or TBD"],
  ["mockStrategy", "Mock strategy: fixtures, msw, service-layer-stub, or custom"],
  ["mockLocation", "Mock location"],
  ["mockStates", "Mock states to simulate"],
  ["sensitiveDataPolicy", "Sensitive data policy"],
  ["businessGoal", "Primary business goal"],
  ["successState", "User success state"],
  ["stakeholders", "Stakeholders"],
  ["lintCommand", "Lint command"],
  ["typecheckCommand", "Typecheck command"],
  ["testCommand", "Test command"],
  ["e2eCommand", "End-to-end test command (Playwright)"]
];

async function collectDiscoveryAnswers(targetRoot, config) {
  const defaults = discoveryDefaults(targetRoot, config);
  const useDefaults = hasFlag("--defaults");
  const answers = {};
  let prompt;

  if (!useDefaults) {
    if (!process.stdin.isTTY) {
      fail("homero discover needs an interactive terminal or --defaults.");
    }

    prompt = createInterface({ input: process.stdin, output: process.stdout });
  }

  try {
    for (const [key, label] of discoveryFields) {
      const flagValue = readArg(`--${key}`);

      if (flagValue !== undefined) {
        answers[key] = flagValue;
        continue;
      }

      if (useDefaults) {
        answers[key] = defaults[key];
        continue;
      }

      const response = await prompt.question(`${label} (${defaults[key]}): `);
      answers[key] = response.trim() || defaults[key];
    }
  } finally {
    prompt?.close();
  }

  return answers;
}

function businessDocument(answers) {
  return `# Business context

Generated by \`homero discover\`.

## Product summary

- Product name: ${answers.projectName}
- Project status: ${answers.projectStatus}
- Countries or variants: ${answers.countries}
- Primary business goal: ${answers.businessGoal}
- User success state: ${answers.successState}

## Per-feature questions to resolve in /homero-plan, not here

This checklist is NOT part of \`homero discover\` — these are project-wide
reminders of what every individual feature's plan needs to answer, one
feature at a time, in \`/homero-plan\` (Figma reading and screenshots
included). Nothing here gets asked again during discovery.

1. What user problem does this step solve?
2. Which country variant is in scope right now?
3. What is the exact success state for the user?
4. What are the required validation rules?
5. Which API or server action dependencies exist?
6. Which backend contract, draft contract, or fixture source exists?
7. Which mock states must the frontend support before backend integration?
8. Is there a Figma URL or node to follow?
9. Which analytics or tracking events must be emitted?
10. Which responsive variants are mandatory?

## Figma workspace

Team-wide Figma convention, if any — not a specific screen (each feature's
own Figma URL is handled in \`/homero-plan\`):

- ${answers.figmaSource}

## Backend contract source

- Mode: ${answers.contractMode}
- Format: ${answers.contractFormat}
- Source: ${answers.contractSource}
- Mock strategy: ${answers.mockStrategy}
- Mock states: ${answers.mockStates}

## Stakeholders

- ${answers.stakeholders}

## Out of scope

List what the current product or step must not cover.
`;
}

function architectureDocument(answers) {
  return `# Frontend architecture

Generated by \`homero discover\`.

## Selected stack

- Framework: ${answers.framework}
- Runtime: ${answers.runtime}
- Forms: ${answers.formStack}
- Design system: ${answers.designSystem}
- Styling exception: ${answers.stylingException}
- Data stack: ${answers.dataStack}
- Client state: ${answers.stateStack}
- Monorepo: ${answers.monorepo}${answers.monorepo && answers.monorepo.toLowerCase() !== "no" ? " — this Homero installation covers only the app rooted at the --target path used for init/discover, not the whole workspace. A different app in the same monorepo needs its own homero init/discover with its own --target." : ""}

## Frontend boundaries

### UI

- UI lives under \`${answers.uiRoot}\` (recorded in \`homero.config.json\` \`paths.uiRoot\`).
- UI lives under \`${answers.uiRoot}/{country}/\` when behavior varies by country. Only copy, validation messages, and business rules should vary per country — keep the shared shell and logic reusable across countries.
- If a view or form does not vary in structure between countries (only in data), keep a single implementation under \`${answers.uiRoot}/global/{Name}\` instead of forking it per country.
- Repeated form patterns should keep \`schema.ts\`, \`use*.ts\`, and \`index.tsx\` together.
- Tests mirror source paths under \`${answers.testRoot}/\` (recorded in \`paths.testRoot\`) instead of being colocated.

### Routing and steps

- Step routes live under \`${answers.stepRoot}\` (recorded in \`homero.config.json\` \`paths.stepRoot\`).
- A step owns orchestration, not all field logic.
- Form logic should stay close to the form itself.

### Shared step widgets

- Before adding a new shared widget, search \`${answers.widgetsRoot}\` (and prior features under \`features/\`) for one that already covers the need — reuse or extend it instead of duplicating.
- Cross-step layout and summary widgets live under \`${answers.widgetsRoot}\` (recorded in \`homero.config.json\` \`paths.widgetsRoot\`).
- A shared summary widget must not read state stores directly; each step reads its own store and passes primitives as props.
- Reuse one shared step layout for steps that need an order/progress summary instead of duplicating layout per step.
- Client state stores live under \`${answers.storesRoot}\` (recorded in \`paths.storesRoot\`).

### Data and transport

- Read flows should follow the selected data stack.
- Write flows should not leak backend details to the client layer.
- Sensitive transport and logging belong on the server boundary.
- Backend-dependent UI should use recorded contracts or draft fixtures so frontend work can proceed independently.
- Two write-transport patterns are valid; record the choice in \`homero.config.json\` \`transport.pattern\`: **server-actions** (typed server actions/handlers under \`${answers.serverActionsRoot}\`, recorded in \`paths.serverActionsRoot\`) or **proxy-middleware** (a self-contained edge/proxy layer for route gating, trace-id propagation, and cookies that must not import application modules).

## Figma to code

1. Read the design node or frame.
2. Identify existing design-system components first.
3. Translate layout intent to project-approved layout primitives.
4. Use design tokens or approved CSS variables instead of ad-hoc values.
5. Validate the final UI against the design and product intent.

## What to reject

- Tailwind copied directly from MCP output without an explicit project exception.
- Generic wrappers around design-system components with no real logic.
- Form types duplicated manually when inferred schema types should be used.
- Client-side code that should clearly belong to the server boundary.

## Known gotchas

- A file that imports the design system may need an explicit client boundary directive (e.g. \`'use client'\`) even without hooks, if the package calls browser-only APIs internally — confirm this against the selected design system.
- Do not reintroduce an ambiguous or duplicate name for a concept that already has a resolved name in the repo (e.g. a country/form resolver).
`;
}

function conventionsDocument(answers) {
  return `# Frontend conventions

Generated by \`homero discover\`.

## Design system

- Required design system: Tomaco
- Styling exception: ${answers.stylingException}
- Prefer existing project layout classes, tokens, and components before custom CSS.
- Do not introduce another design system.

## Forms

- Selected form stack: ${answers.formStack}
- Use one directory per form.
- Keep \`schema.ts\`, \`use<FormName>.ts\`, and \`index.tsx\` together when this matches the repo pattern.
- Derive value types from validation schemas when the selected stack supports it.
- Prefer deterministic scaffolding for new forms:
  \`node .\\scripts\\homero\\new-form.mjs --name FormName --country cl\`

## Figma and UX

- Figma workspace convention: ${answers.figmaSource}
- Each feature's own Figma URL/node is provided per feature in \`/homero-plan\`, not during discovery.
- Treat Figma output as reference, not as final code.
- Preserve label clarity, field intent, keyboard behavior, and focus behavior.
- Clarify missing business behavior instead of guessing from visual layout.

## Testing

- Mirror source paths under the project's test root instead of colocating test files, unless the repo already colocates tests before Homero was installed.

## Naming

- Component directories: PascalCase.
- Hooks: \`useX\`.
- Schemas: \`schema\`.
- Inferred value types: \`<FormName>Values\`.
- Once a naming decision is resolved for a shared concept (e.g. a country/form resolver), keep using it instead of reintroducing an older or more ambiguous name.
`;
}

function contractsDocument(answers) {
  return `# Backend contracts and mocks

Generated by \`homero discover\`.

Frontend work should be able to progress before the backend is ready, but it
must not invent data shapes silently. Use this document to record the contract
source and mock strategy for backend-dependent features.

## Contract mode

- Mode: ${answers.contractMode}
- Format: ${answers.contractFormat}
- Source: ${answers.contractSource}
- Owner: ${answers.stakeholders}

## Mock strategy

- Strategy: ${answers.mockStrategy}
- Mock location: ${answers.mockLocation}
- States to simulate: ${answers.mockStates}

## Sensitive data policy

- Policy: ${answers.sensitiveDataPolicy}
- Use anonymized examples only.
- Do not commit secrets, tokens, personal identifiers, or production payloads.
- Replace real customer data with realistic fake values.

## Open contract questions

- Confirm whether the selected contract mode is final enough for implementation.
- Confirm required success, validation error, business error, and server error payloads.
- Confirm which fields are sensitive and must be masked in mocks.

## Frontend independence rule

If final backend contracts are unavailable, create a draft contract or fixture
set and mark it clearly as temporary. The feature plan must record what needs to
be confirmed with backend before production integration.
`;
}

function constitutionDocument(answers) {
  return `# Homero constitution

Generated by \`homero discover\`.

Homero's CLI lives at \`scripts/homero/homero.mjs\`, copied there by
\`homero init\`. Every \`homero <command>\` mentioned below means
\`node scripts/homero/homero.mjs <command> --target . ...\`.

## Governing principles

1. Business intent comes before implementation details.
2. Every visual feature requires an approved Figma URL, node, and version. Unclear business behavior must be clarified.
3. Tomaco is mandatory for UI implementation.
4. Forms must use the selected stack: ${answers.formStack}.
5. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-backend exception.
6. Mocks must be realistic, anonymized, traceable to a contract source or recorded assumption, and development-only.
7. Feature work must use \`homero feature create\`, producing a branch, contract, spec, plan, task list, Playwright CLI evidence, and verification receipt.
8. The AI agent must ask about blocking ambiguity before implementing.
9. The AI agent should implement without extra confirmation when the feature gate passes.
10. Verification commands in \`homero.config.json\` are part of the definition of done.
11. Only humans may commit, push, open pull requests, merge, or modify Figma.
12. Features must record which countries they target in \`feature.json\`. Keep country-specific business rules, copy, and validation messages isolated from shared logic so adding a country does not require rewriting shared code.
13. The AI agent must use \`graphify query\` (see \`docs/homero/knowledge-graph.md\`) instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase. Reading files one by one for exploration that a graph query could answer wastes tokens and is a constitution violation, not a style preference.
14. UI states and field-level behavior recorded in a spec must be specific to the screen being built. The default \`requirements.uiStates\` list in \`feature.json\` is a starting checklist, not proof of analysis. Every form input needs its exact validation error copy, and every interactive element whose behavior is not visually obvious (tooltips, secondary buttons, "more info" links or icons, accordions) must have its behavior confirmed or recorded as an open question.
15. Before adding a new shared widget or component, search the repo (and \`graphify query\` for relationship questions) for one that already covers the need. Reuse or extend it — a new file duplicating existing shared UI is a rejection, not a style note.
16. Before building a new component, confirm Tomaco does not already ship one for the need — check the Figma Code Connect mapping (if configured) and the installed \`tomaco-components\` package, not just memory. A hand-built lookalike of an existing Tomaco component is a rejection, not a style note.
17. A referenced secondary surface (modal, drawer, tooltip content, sub-screen) without its own approved Figma coverage must not be invented. Ask whether to source a design for it or leave it out of the feature — both are valid answers; do not word the question as if a design is the only acceptable one.

## Rejection criteria

A feature plan or implementation should be rejected if it:

- contradicts the selected design system without an explicit exception
- omits an approved Figma reference or implements UI outside Tomaco
- invents business rules that were not specified or confirmed
- invents backend payloads without recording a contract mode or draft assumption
- copies raw Figma or Tailwind output without adapting it to the project
- skips required validation for forms or server boundaries
- lacks executable verification or a passing Homero receipt
- hardcodes country-specific business rules, copy, or validation messages inside shared logic instead of isolating them per country
- explores unfamiliar code file-by-file when \`graphify query\` was available and unused
- leaves UI states or validation error copy as the generic default instead of screen-specific content, or leaves an interactive element's behavior unconfirmed
- introduces a new shared widget or component that duplicates one already available under \`paths.widgetsRoot\`
- builds a component that duplicates one \`tomaco-components\` already ships instead of reusing or composing it
- implements a referenced surface (modal, drawer, tooltip content, sub-screen) that has no approved Figma source instead of asking whether to source one or skip it
`;
}

function discoveredConfig(config, answers) {
  return {
    ...config,
    projectName: answers.projectName,
    packageManager: answers.packageManager,
    lintGuardrail: answers.lintGuardrail,
    commands: {
      ...config.commands,
      lint: answers.lintCommand,
      typecheck: answers.typecheckCommand,
      test: answers.testCommand,
      e2e: answers.e2eCommand
    },
    paths: {
      ...config.paths,
      uiRoot: answers.uiRoot,
      stepRoot: answers.stepRoot,
      serverActionsRoot: answers.serverActionsRoot,
      storesRoot: answers.storesRoot,
      widgetsRoot: answers.widgetsRoot,
      testRoot: answers.testRoot
    },
    discovery: {
      ...config.discovery,
      projectStatus: answers.projectStatus,
      monorepo: answers.monorepo,
      countries: answers.countries,
      figmaSource: answers.figmaSource,
      businessGoal: answers.businessGoal,
      successState: answers.successState,
      stakeholders: answers.stakeholders
    },
    stack: {
      ...config.stack,
      framework: answers.framework,
      runtime: answers.runtime,
      forms: answers.formStack,
      designSystem: answers.designSystem,
      stylingException: answers.stylingException,
      data: answers.dataStack,
      state: answers.stateStack
    },
    product: {
      ...config.product,
      designSystemPackage: answers.designSystemPackage
    },
    contracts: {
      ...config.contracts,
      mode: answers.contractMode,
      format: answers.contractFormat,
      source: answers.contractSource,
      mockStrategy: answers.mockStrategy,
      mockLocation: answers.mockLocation,
      states: answers.mockStates,
      sensitiveDataPolicy: answers.sensitiveDataPolicy
    }
  };
}

function slugify(value) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validateFeatureId(id) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(id)) {
    fail("Feature id must contain only letters, numbers, dots, underscores, and hyphens.");
  }
}

function figmaNodeIdFromUrl(url) {
  try {
    return new URL(url).searchParams.get("node-id");
  } catch {
    return null;
  }
}

function featurePaths(targetRoot, id, name) {
  const slug = slugify(name);

  return {
    branch: `feature/${id}-${slug}`,
    featureDir: path.join(targetRoot, "features", id),
    specDir: path.join(targetRoot, "specs", `${id}-${slug}`),
    featurePath: path.join(targetRoot, "features", id, "feature.json"),
    evidencePath: path.join(targetRoot, "features", id, "evidence", "playwright-cli.json"),
    statePath: path.join(targetRoot, "features", id, "state.json"),
    eventsPath: path.join(targetRoot, "features", id, "events.ndjson")
  };
}

// Shared with featureErrors(): the starting checklist featureTemplate() ships is fine as a
// prompt, but principle 14 in constitution.md requires it get replaced with screen-specific UI
// states — featureErrors() rejects a feature.json that still has this exact array, untouched.
const defaultUiStates = ["loading", "success", "empty", "validation-error", "business-error", "server-error"];

function featureTemplate({ id, name, branch, figmaUrl, figmaVersion, contractMode, contractSource, contractException, countries, config }) {
  return {
    schemaVersion: 1,
    id,
    name,
    status: "draft",
    branch,
    product: {
      portfolio: config.product?.portfolio || "Falabella Seguros",
      designSystem: "Tomaco",
      countries
    },
    design: {
      visualChange: true,
      figma: {
        url: figmaUrl,
        nodeId: figmaNodeIdFromUrl(figmaUrl),
        version: figmaVersion
      },
      viewports: ["desktop", "mobile"],
      visualDiffThreshold: config.figma?.visualDiffThreshold ?? 0.01
    },
    contracts: {
      mode: contractMode,
      source: contractSource || "not-applicable",
      exception: contractException || null,
      productionMockFallbackAllowed: false,
      mocks: {
        location: config.contracts?.mockLocation || "src/mocks",
        registered: false,
        source: null
      }
    },
    requirements: {
      acceptanceCriteria: [],
      uiStates: [...defaultUiStates],
      openQuestions: []
    },
    verification: {
      required: ["lint", "typecheck", "test", "e2e", "playwright-cli"],
      playwrightCliEvidence: "evidence/playwright-cli.json"
    },
    receipt: null
  };
}

function playwrightCliEvidenceTemplate(id) {
  return {
    schemaVersion: 1,
    featureId: id,
    session: `homero-${id}`,
    scenarios: []
  };
}

function loopStateTemplate(feature, config) {
  return {
    schemaVersion: 1,
    featureId: feature.id,
    phase: "ready",
    activeTaskId: null,
    limits: {
      maxIterations: config.runtime?.maxIterations ?? 10,
      maxAttemptsPerTask: config.runtime?.maxAttemptsPerTask ?? 3,
      maxVerifyAttempts: config.runtime?.maxVerifyAttempts ?? 2
    },
    iterations: 0,
    verifyAttempts: 0,
    tasks: [],
    updatedAt: new Date().toISOString()
  };
}

function readLoopState(featureDir) {
  const statePath = path.join(featureDir, "state.json");

  if (!fs.existsSync(statePath)) {
    fail(`Loop state not found: ${statePath}`);
  }

  return {
    statePath,
    state: readJsonFile(statePath, "Loop state")
  };
}

function appendLoopEvent(featureDir, event) {
  const eventPath = path.join(featureDir, "events.ndjson");
  const record = {
    at: new Date().toISOString(),
    ...event
  };

  fs.appendFileSync(eventPath, `${JSON.stringify(record)}\n`, "utf8");
}

function writeLoopState(featureDir, state) {
  state.updatedAt = new Date().toISOString();
  writeJsonFile(path.join(featureDir, "state.json"), state);
}

const statusByPhase = {
  ready: "ready",
  implementing: "implementing",
  verifying: "verifying",
  "needs-review": "needs-review",
  accepted: "accepted"
};

function ensureLoopState(featureDir, feature, config) {
  const statePath = path.join(featureDir, "state.json");

  if (fs.existsSync(statePath)) {
    return readLoopState(featureDir).state;
  }

  const state = loopStateTemplate(feature, config);
  writeLoopState(featureDir, state);
  appendLoopEvent(featureDir, { type: "state-initialized" });
  return state;
}

function syncFeatureStatus(featurePath, feature, phase) {
  const status = statusByPhase[phase];

  // Once a human has accepted the feature, the loop must never silently move
  // it back (e.g. a task added after acceptance should not un-accept it).
  if (!status || feature.status === "accepted") {
    return;
  }

  feature.status = status;
  writeJsonFile(featurePath, feature);
}

function nextTaskId(state) {
  const maxSuffix = state.tasks.reduce((max, task) => {
    const match = /^T-(\d+)$/.exec(task.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  return `T-${String(maxSuffix + 1).padStart(3, "0")}`;
}

function selectNextTask(state) {
  const active = state.tasks.find(task => task.id === state.activeTaskId && task.status === "in-progress");
  return active || state.tasks.find(task => task.status === "pending") || null;
}

function verifyLimitFor(state, config) {
  return state.limits?.maxVerifyAttempts ?? config.runtime?.maxVerifyAttempts ?? 2;
}

function findTaskOrFail(state, taskId) {
  const task = state.tasks.find(candidate => candidate.id === taskId);
  if (!task) {
    fail(`Task not found: ${taskId}`);
  }

  return task;
}

function readLastEvents(featureDir, count) {
  const eventsPath = path.join(featureDir, "events.ndjson");

  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean);
  // A process killed mid-append can leave the last line truncated. Skip a line that fails to
  // parse instead of crashing `task status` — the earlier, complete events are still useful.
  return lines
    .slice(-count)
    .map(line => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function implementBrief(feature, state, task) {
  const lines = [
    `Feature ${feature.id}: iteration ${state.iterations}/${state.limits.maxIterations}`,
    `Task ${task.id}: ${task.title}`
  ];

  if (task.paths.length > 0) {
    lines.push(`Suggested paths: ${task.paths.join(", ")}`);
  }

  lines.push(`Attempts so far: ${task.attempts}/${state.limits.maxAttemptsPerTask}`);
  lines.push("Use Tomaco and follow the approved spec/plan for this feature.");
  lines.push(`When done: homero task verify --target <repo> --id ${feature.id} --task ${task.id} --summary "<what changed>"`);
  lines.push(`If blocked: homero task block --target <repo> --id ${feature.id} --task ${task.id} --reason "<why>"`);

  return lines.join("\n");
}

function fillFeatureTemplate(templatePath, destinationPath, replacements) {
  let content = fs.readFileSync(templatePath, "utf8");

  for (const [token, value] of Object.entries(replacements)) {
    content = content.replaceAll(token, value);
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, content, "utf8");
}

function git(targetRoot, args, options = {}) {
  return spawnSync("git", args, {
    cwd: targetRoot,
    encoding: "utf8",
    ...options
  });
}

function gitText(targetRoot, args) {
  const result = git(targetRoot, args);
  return result.status === 0 ? result.stdout.trim() : null;
}

function mainBranchName(targetRoot) {
  // Prefer the remote's actual default branch when one is configured; falls back to whichever
  // of the two common names actually exists locally, then to "main" as a last resort — this
  // never needs to be exactly right, only good enough to stop `feature create` running on it.
  const symbolicRef = gitText(targetRoot, ["symbolic-ref", "refs/remotes/origin/HEAD"]);
  if (symbolicRef) {
    const match = symbolicRef.match(/^refs\/remotes\/origin\/(.+)$/);
    if (match) {
      return match[1];
    }
  }

  for (const candidate of ["main", "master"]) {
    if (gitText(targetRoot, ["rev-parse", "--verify", "--quiet", `refs/heads/${candidate}`]) !== null) {
      return candidate;
    }
  }

  return "main";
}

function ensureCleanGitRepo(
  targetRoot,
  reason = "homero feature create requires a clean working tree to keep the feature branch isolated.",
  commandName = "homero feature create"
) {
  if (gitText(targetRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    fail(`${commandName} requires a Git repository.`);
  }

  const workingTree = gitText(targetRoot, ["status", "--porcelain"]);
  if (workingTree === null) {
    fail("Could not inspect the Git working tree.");
  }

  if (workingTree) {
    fail(reason);
  }
}

function featureErrors(targetRoot, feature) {
  const errors = [];
  const requiredStatuses = new Set(["ready", "implementing", "verifying", "needs-review", "accepted"]);
  const requiredChecks = new Set(["lint", "typecheck", "test", "e2e", "playwright-cli"]);

  if (feature.schemaVersion !== 1) {
    errors.push("feature.json schemaVersion must be 1");
  }

  if (!feature.id || typeof feature.id !== "string") {
    errors.push("feature.json must include an id");
  }

  if (!feature.name || typeof feature.name !== "string") {
    errors.push("feature.json must include a name");
  }

  if (!feature.branch || gitText(targetRoot, ["branch", "--show-current"]) !== feature.branch) {
    errors.push("feature check must run from the branch recorded in feature.json");
  }

  if (!requiredStatuses.has(feature.status)) {
    errors.push("feature status must be ready, implementing, verifying, needs-review, or accepted");
  }

  if (feature.product?.portfolio !== "Falabella Seguros") {
    errors.push("feature product.portfolio must be Falabella Seguros");
  }

  if (feature.product?.designSystem !== "Tomaco") {
    errors.push("feature product.designSystem must be Tomaco");
  }

  if (
    !Array.isArray(feature.product?.countries) ||
    feature.product.countries.length === 0 ||
    !feature.product.countries.every(country => typeof country === "string" && country.trim().length > 0)
  ) {
    errors.push("feature must record at least one country in product.countries");
  }

  if (!feature.design?.visualChange) {
    errors.push("feature design.visualChange must be true for the Falabella frontend workflow");
  }

  if (!feature.design?.figma?.url || !feature.design?.figma?.version) {
    errors.push("feature must record an approved Figma URL and version");
  } else if (!feature.design.figma.nodeId) {
    // Principle 2 requires a Figma "URL, node, and version" — a URL with no node-id query
    // param means the reference points at the whole file, not the approved screen.
    errors.push("feature's Figma URL must include a node-id (points at the whole file, not an approved screen)");
  }

  if (!Array.isArray(feature.design?.viewports) || !feature.design.viewports.includes("desktop") || !feature.design.viewports.includes("mobile")) {
    errors.push("feature must verify desktop and mobile viewports");
  }

  if (!Number.isFinite(feature.design?.visualDiffThreshold) || feature.design.visualDiffThreshold < 0 || feature.design.visualDiffThreshold > 1) {
    errors.push("feature design.visualDiffThreshold must be a number between 0 and 1");
  }

  const contractMode = feature.contracts?.mode;
  if (!new Set(["contract-first", "contract-draft", "no-backend-exception"]).has(contractMode)) {
    errors.push("feature contracts.mode is invalid");
  } else if (contractMode === "no-backend-exception") {
    if (!feature.contracts.exception) {
      errors.push("no-backend-exception requires contracts.exception");
    }
  } else {
    if (!feature.contracts.source || feature.contracts.source === "TBD") {
      errors.push("backend-dependent feature requires a recorded contract source");
    }

    if (!feature.contracts.mocks?.registered || !feature.contracts.mocks?.source) {
      errors.push("backend-dependent feature requires registered development mocks and their source");
    } else if (!fs.existsSync(path.resolve(targetRoot, feature.contracts.mocks.source))) {
      // mocks.registered=true + mocks.source is a claim, not proof — this is the exact gap that
      // let an agent (or a human) mark mocks done without a real file ever landing on disk.
      errors.push(`backend-dependent feature's mock source does not exist on disk: ${feature.contracts.mocks.source}`);
    }
  }

  if (feature.contracts?.productionMockFallbackAllowed !== false) {
    errors.push("productionMockFallbackAllowed must be false");
  }

  if (!Array.isArray(feature.requirements?.acceptanceCriteria) || feature.requirements.acceptanceCriteria.length === 0) {
    errors.push("feature requires at least one acceptance criterion");
  }

  if (!Array.isArray(feature.requirements?.uiStates) || feature.requirements.uiStates.length === 0) {
    errors.push("feature requires explicit UI states");
  } else if (JSON.stringify(feature.requirements.uiStates) === JSON.stringify(defaultUiStates)) {
    // Principle 14 in constitution.md: the shipped list is a starting checklist, not proof of
    // analysis. Nothing enforced that until now — an untouched feature.json sailed through.
    errors.push(
      "feature requirements.uiStates is still the generic default checklist — principle 14 requires screen-specific UI states and exact validation copy, not the starting list `feature create` ships"
    );
  }

  if (!Array.isArray(feature.requirements?.openQuestions) || feature.requirements.openQuestions.length > 0) {
    errors.push("feature has unresolved open questions");
  }

  if (!Array.isArray(feature.verification?.required) || ![...requiredChecks].every(check => feature.verification.required.includes(check))) {
    errors.push("feature verification must require lint, typecheck, test, e2e, and playwright-cli evidence");
  }

  return errors;
}

// Principle 18 in constitution.md: plan.md must name exact Tomaco components/tokens and
// pixel-perfect styling per screen, not a general description. Same philosophy as the
// uiStates default-checklist rejection above: compare against the shipped template's own
// default content for that section, rather than just checking "non-empty" — some sections
// (like the two below) ship with instructional prose ahead of their placeholder bullet, so
// "non-empty" alone would pass an agent that never touched the section at all.
const requiredPlanSections = [
  "Technical summary",
  "Repo patterns to reuse",
  "Tomaco components and tokens",
  "Pixel-perfect styling",
  "Files to create or modify",
  "Form and validation plan",
  "Figma adaptation plan"
];

function parseMarkdownSections(markdown) {
  const sections = {};
  let currentHeading = null;
  let buffer = [];

  const flush = () => {
    if (currentHeading !== null) {
      sections[currentHeading] = buffer.join("\n").trim();
    }
  };

  // Normalize CRLF first: the shipped template (and anything re-saved by a Windows editor)
  // uses \r\n, and comparing an unnormalized feature plan.md against an unnormalized template
  // could make an untouched section look "edited" purely from a line-ending difference.
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const match = /^##\s+(.+?)\s*$/.exec(line);
    if (match) {
      flush();
      currentHeading = match[1];
      buffer = [];
    } else if (currentHeading !== null) {
      buffer.push(line);
    }
  }
  flush();

  return sections;
}

function planErrors(workspaceRoot, specDir) {
  const planPath = path.join(specDir, "plan.md");

  if (!fs.existsSync(planPath)) {
    return [`plan.md not found at ${planPath} — run \`homero feature create\` before checking, running, or verifying this feature`];
  }

  const planSections = parseMarkdownSections(fs.readFileSync(planPath, "utf8"));
  const templatePath = path.join(workspaceRoot, "specs", "_template", "plan.md");
  const templateSections = fs.existsSync(templatePath)
    ? parseMarkdownSections(fs.readFileSync(templatePath, "utf8"))
    : {};

  const errors = [];

  for (const heading of requiredPlanSections) {
    const body = planSections[heading];

    if (!body) {
      errors.push(`plan.md is missing the required section "${heading}"`);
      continue;
    }

    if (templateSections[heading] !== undefined && body === templateSections[heading]) {
      errors.push(
        `plan.md section "${heading}" is still the unedited template placeholder — principle 18 requires exact Tomaco components, tokens, and pixel-perfect styling per screen before implementation starts`
      );
    }
  }

  return errors;
}

function safeEvidencePath(featureDir, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    return null;
  }

  const candidate = path.resolve(featureDir, relativePath);
  const evidenceRoot = path.resolve(featureDir, "evidence");
  return candidate.startsWith(`${evidenceRoot}${path.sep}`) ? candidate : null;
}

function playwrightEvidenceErrors(featureDir, feature) {
  const errors = [];
  const relativePath = feature.verification?.playwrightCliEvidence;
  const evidencePath = safeEvidencePath(featureDir, relativePath);

  if (!evidencePath || !fs.existsSync(evidencePath)) {
    return ["missing Playwright CLI evidence file under features/<id>/evidence/"];
  }

  const evidence = readJsonFile(evidencePath, "Playwright CLI evidence");
  if (evidence.featureId !== feature.id) {
    errors.push("Playwright CLI evidence featureId does not match feature.json");
  }

  if (!evidence.session || typeof evidence.session !== "string") {
    errors.push("Playwright CLI evidence must record a session");
  }

  if (!Array.isArray(evidence.scenarios) || evidence.scenarios.length === 0) {
    errors.push("Playwright CLI evidence requires at least one scenario");
    return errors;
  }

  for (const scenario of evidence.scenarios) {
    if (!scenario.name || scenario.status !== "passed") {
      errors.push("every Playwright CLI scenario must have a name and passed status");
      continue;
    }

    for (const artifactName of ["screenshot", "snapshot"]) {
      const artifactPath = safeEvidencePath(featureDir, scenario[artifactName]);
      if (!artifactPath || !fs.existsSync(artifactPath)) {
        errors.push(`Playwright CLI scenario ${scenario.name} is missing its ${artifactName} artifact`);
      }
    }
  }

  return errors;
}

function readFeature(targetRoot, id) {
  validateFeatureId(id);
  const workspaceRoot = findFeatureWorkspace(targetRoot, id);
  const featurePath = path.join(workspaceRoot, "features", id, "feature.json");

  if (!fs.existsSync(featurePath)) {
    fail(`Feature contract not found: ${featurePath}`);
  }

  return {
    workspaceRoot,
    featurePath,
    featureDir: path.dirname(featurePath),
    feature: readJsonFile(featurePath, "feature.json")
  };
}

function findFeatureWorkspace(targetRoot, id) {
  // No worktree to search anymore — feature create checks the branch out in place, so the
  // feature only ever lives directly under targetRoot, on whichever branch is currently
  // checked out there.
  const featurePath = path.join(targetRoot, "features", id, "feature.json");
  if (fs.existsSync(featurePath)) {
    return targetRoot;
  }

  fail(
    `Feature ${id} was not found in ${targetRoot} on the currently checked-out branch. If it lives on a different branch, check that branch out first (git checkout feature/${id}-<slug>) before running Homero commands for it.`
  );
}

function featureCheck(targetRoot, id) {
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const specDir = featurePaths(workspaceRoot, feature.id, feature.name).specDir;
  // Deliberately NOT playwrightEvidenceErrors here. `feature check` is the pre-implementation
  // gate (feature create -> feature check -> implement) — requiring evidence of an
  // implementation that doesn't exist yet made it structurally impossible to pass before any
  // code was written, a circular dependency `homero run`'s own gate never had (it only checks
  // featureErrors + planErrors — see runLoop()). Evidence is verified where it actually belongs:
  // verifyFeature()'s gate, after implementation.
  const errors = [
    ...featureErrors(workspaceRoot, feature),
    ...planErrors(workspaceRoot, specDir)
  ];

  return { feature, featureDir, workspaceRoot, errors };
}

function featureCreate() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const name = readArg("--name");
  const figmaUrl = readArg("--figma");
  const figmaVersion = readArg("--figma-version");
  const contractMode = readArg("--contract-mode");
  const contractSource = readArg("--contract-source");
  const contractException = readArg("--contract-exception");
  const countriesArg = readArg("--countries");

  if (!targetArg || !id || !name || !figmaUrl || !figmaVersion || !contractMode || !countriesArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id && name && figmaUrl && figmaVersion && contractMode && countriesArg ? 0 : 1);
  }

  const countries = [...new Set(
    countriesArg.split(",").map(value => value.trim().toLowerCase()).filter(Boolean)
  )];

  if (countries.length === 0) {
    fail("homero feature create requires --countries with at least one country.");
  }

  validateFeatureId(id);
  const targetRoot = path.resolve(targetArg);
  const config = readConfig(targetRoot);

  if (!fs.existsSync(path.join(targetRoot, "homero.config.json"))) {
    fail("homero feature create requires a Homero-initialized repository.");
  }

  if (!new Set(["contract-first", "contract-draft", "no-backend-exception"]).has(contractMode)) {
    fail("Invalid contract mode.");
  }

  if (contractMode === "no-backend-exception" && !contractException) {
    fail("no-backend-exception requires --contract-exception.");
  }

  if (contractMode !== "no-backend-exception" && !contractSource) {
    fail("Backend-dependent features require --contract-source.");
  }

  if (fs.existsSync(path.join(targetRoot, "features", id))) {
    fail(`Feature artifacts already exist for ${id}.`);
  }

  ensureCleanGitRepo(
    targetRoot,
    "homero feature create requires a clean working tree — it writes spec/plan/task files into the branch you already have checked out, and uncommitted changes would get mixed in with them."
  );

  // No worktree, and no branch creation either: the human checks out their own feature branch
  // before running this (that's the point of the plan checkpoint being reachable from
  // /homero-plan without homero having to guess a branch name up front). This only refuses to
  // run on the main branch, so a feature never accidentally gets built directly on it.
  const currentBranch = gitText(targetRoot, ["branch", "--show-current"]);
  if (!currentBranch) {
    fail(
      "homero feature create requires an existing branch to be checked out (not a detached HEAD). " +
        `Create one first: git checkout -b feature/${id}-${slugify(name)}`
    );
  }

  const mainBranch = mainBranchName(targetRoot);
  if (currentBranch === mainBranch) {
    fail(
      `homero feature create no longer creates a branch for you — check out a feature branch first ` +
        `(git checkout -b feature/${id}-${slugify(name)}), then run this again. You're currently on ${mainBranch}.`
    );
  }

  const branch = currentBranch;
  const paths = featurePaths(targetRoot, id, name);

  const feature = featureTemplate({
    id,
    name,
    branch,
    figmaUrl,
    figmaVersion,
    contractMode,
    contractSource,
    contractException,
    countries,
    config
  });

  writeJsonFile(paths.featurePath, feature);
  writeJsonFile(paths.evidencePath, playwrightCliEvidenceTemplate(id));
  writeJsonFile(paths.statePath, loopStateTemplate(feature, config));
  appendLoopEvent(paths.featureDir, {
    type: "feature-created",
    branch
  });

  const specTemplate = path.join(targetRoot, "specs", "_template", "spec.md");
  const planTemplate = path.join(targetRoot, "specs", "_template", "plan.md");
  const tasksTemplate = path.join(targetRoot, "specs", "_template", "tasks.md");
  const replacements = {
    "<feature-name>": `${id}: ${name}`,
    "__FEATURE_ID__": id,
    "__FEATURE_NAME__": name,
    "__FIGMA_URL__": figmaUrl,
    "__FIGMA_VERSION__": figmaVersion,
    "__CONTRACT_MODE__": contractMode,
    "__CONTRACT_SOURCE__": contractSource || "not-applicable"
  };

  for (const [templatePath, destinationPath] of [
    [specTemplate, path.join(paths.specDir, "spec.md")],
    [planTemplate, path.join(paths.specDir, "plan.md")],
    [tasksTemplate, path.join(paths.specDir, "tasks.md")]
  ]) {
    if (!fs.existsSync(templatePath)) {
      fail(`Feature template not found: ${templatePath}`);
    }

    fillFeatureTemplate(templatePath, destinationPath, replacements);
  }

  console.log(`Feature ${id} created on ${branch} (existing branch — homero did not create it).`);
  console.log(`Contract: ${path.relative(targetRoot, paths.featurePath)}`);
  console.log(`Spec: ${path.relative(targetRoot, path.join(paths.specDir, "spec.md"))}`);
  console.log("The feature remains draft until Homero gates pass.");
}

function featureCheckCommand() {
  const targetArg = readArg("--target");
  const id = readArg("--id");

  requireTargetAndId(targetArg, id);

  const targetRoot = path.resolve(targetArg);
  const { errors } = featureCheck(targetRoot, id);

  if (errors.length > 0) {
    console.error(`Feature ${id} is blocked:`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Feature ${id} passed Homero gates.`);
}

function runVerificationCommand(targetRoot, name, command) {
  const result = spawnSync(command, {
    cwd: targetRoot,
    shell: true,
    encoding: "utf8"
  });

  return {
    name,
    command,
    exitCode: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    passed: result.status === 0
  };
}

function verifyFeature() {
  const targetArg = readArg("--target");
  const id = readArg("--id");

  requireTargetAndId(targetArg, id);

  const targetRoot = path.resolve(targetArg);
  const config = readConfig(targetRoot);
  const { workspaceRoot, featurePath, featureDir, feature } = readFeature(targetRoot, id);
  const workspaceConfig = readConfig(workspaceRoot);
  const gateErrors = [
    ...featureErrors(workspaceRoot, feature),
    ...playwrightEvidenceErrors(featureDir, feature),
    ...planErrors(workspaceRoot, featurePaths(workspaceRoot, feature.id, feature.name).specDir)
  ];

  if (gateErrors.length > 0) {
    console.error(`Feature ${id} cannot be verified:`);
    for (const error of gateErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const state = ensureLoopState(featureDir, feature, workspaceConfig);
  const verifyLimit = verifyLimitFor(state, workspaceConfig);

  if ((state.verifyAttempts ?? 0) >= verifyLimit) {
    fail(`error_max_verify_attempts: ${feature.id} already failed verification ${state.verifyAttempts} times (limit ${verifyLimit}). Phase 'verify-exhausted' — a human must review the last receipt and either fix it directly or give specific instructions. To retry automatically, reset state.verifyAttempts in state.json or raise runtime.maxVerifyAttempts.`);
  }

  const commandNames = feature.verification.required.filter(name => name !== "playwright-cli");
  const commandResults = [];

  for (const commandName of commandNames) {
    const command = workspaceConfig.commands?.[commandName];
    if (!command || typeof command !== "string") {
      commandResults.push({
        name: commandName,
        command: null,
        exitCode: null,
        stdout: "",
        stderr: `Missing homero.config.json commands.${commandName}`,
        passed: false
      });
      continue;
    }

    const result = runVerificationCommand(workspaceRoot, commandName, command);
    commandResults.push(result);
    process.stdout.write(result.stdout);
    process.stderr.write(result.stderr);
  }

  const passed = commandResults.every(result => result.passed);
  const createdAt = new Date().toISOString();
  const receiptDir = path.join(featureDir, "receipts");
  const receiptPath = path.join(receiptDir, `verify-${createdAt.replace(/[:.]/g, "-")}.json`);
  const receipt = {
    schemaVersion: 1,
    featureId: feature.id,
    branch: gitText(workspaceRoot, ["branch", "--show-current"]),
    gitHead: gitText(workspaceRoot, ["rev-parse", "HEAD"]),
    createdAt,
    status: passed ? "passed" : "failed",
    checks: commandResults,
    playwrightCliEvidence: feature.verification.playwrightCliEvidence
  };

  writeJsonFile(receiptPath, receipt);
  feature.receipt = path.relative(featureDir, receiptPath);
  writeJsonFile(featurePath, feature);

  if (passed) {
    state.verifyAttempts = 0;
    writeLoopState(featureDir, state);
    console.log(`Feature ${id} verification passed. Receipt: ${path.relative(targetRoot, receiptPath)}`);
    return;
  }

  state.verifyAttempts = (state.verifyAttempts ?? 0) + 1;

  if (state.verifyAttempts >= verifyLimit) {
    state.phase = "verify-exhausted";
    writeLoopState(featureDir, state);
    appendLoopEvent(featureDir, { type: "verify-exhausted", attempts: state.verifyAttempts, limit: verifyLimit });
    fail(`error_max_verify_attempts: ${feature.id} failed verification ${state.verifyAttempts} times (limit ${verifyLimit}). Phase 'verify-exhausted' — a human must review the receipt and either fix it directly or give specific instructions to continue. Receipt: ${path.relative(targetRoot, receiptPath)}`);
  }

  writeLoopState(featureDir, state);
  console.error(`Feature ${id} verification failed (attempt ${state.verifyAttempts}/${verifyLimit}). Receipt: ${path.relative(targetRoot, receiptPath)}`);
  process.exit(1);
}

function feature() {
  const featureCommand = commandArgs[0];

  if (featureCommand === "create") {
    featureCreate();
    return;
  }

  if (featureCommand === "check") {
    featureCheckCommand();
    return;
  }

  fail(`Unknown feature command: ${featureCommand || "<missing>"}`);
}

function runLoop() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const asJson = hasFlag("--json");

  requireTargetAndId(targetArg, id);

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featurePath, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);

  const contractErrors = [
    ...featureErrors(workspaceRoot, feature),
    ...planErrors(workspaceRoot, featurePaths(workspaceRoot, feature.id, feature.name).specDir)
  ];
  if (contractErrors.length > 0) {
    console.error(`Feature ${id} is not ready for the loop:`);
    for (const error of contractErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  const next = selectNextTask(state);
  let brief;

  if (next) {
    const limit = state.limits.maxIterations ?? config.runtime?.maxIterations ?? 10;

    if (state.iterations >= limit) {
      state.phase = "exhausted";
      writeLoopState(featureDir, state);
      appendLoopEvent(featureDir, { type: "run-exhausted", iteration: state.iterations, limit });
      fail(`error_max_iterations: ${feature.id} reached maxIterations (${limit}). Phase 'exhausted'. Reset state.json or raise runtime.maxIterations.`);
    }

    const now = new Date().toISOString();
    state.iterations += 1;
    next.status = "in-progress";
    next.startedAt = next.startedAt || now;
    next.updatedAt = now;
    state.activeTaskId = next.id;
    state.phase = "implementing";
    syncFeatureStatus(featurePath, feature, "implementing");
    brief = implementBrief(feature, state, next);
  } else if (state.tasks.length === 0) {
    state.phase = "ready";
    brief = 'No tasks yet. Add them with `homero task add --target <repo> --id <id> --title "<title>"`.';
  } else {
    const openTasks = state.tasks.filter(task => task.status === "pending" || task.status === "in-progress");
    const blockedOnly = openTasks.length === 0 && state.tasks.some(task => task.status === "blocked");

    if (blockedOnly) {
      state.phase = "blocked";
      brief = "Only blocked tasks remain. Resolve or split them before continuing.";
    } else {
      const verifyLimit = verifyLimitFor(state, config);

      if ((state.verifyAttempts ?? 0) >= verifyLimit) {
        state.phase = "verify-exhausted";
        brief = `Verification failed ${state.verifyAttempts} times (limit ${verifyLimit}). A human must review the last receipt and either fix it directly or give specific instructions before verify runs again.`;
      } else {
        const receiptPath = feature.receipt ? path.join(featureDir, feature.receipt) : null;
        const receipt = receiptPath && fs.existsSync(receiptPath) ? readJsonFile(receiptPath, "Verification receipt") : null;

        if (receipt && receipt.status === "passed") {
          state.phase = "needs-review";
          syncFeatureStatus(featurePath, feature, "needs-review");
          brief = "Verification passed. Awaiting human review; do not self-accept.";
        } else {
          state.phase = "verifying";
          syncFeatureStatus(featurePath, feature, "verifying");
          brief = `All tasks done. Run \`homero verify\`, then \`homero run\` again. (verify attempts: ${state.verifyAttempts ?? 0}/${verifyLimit})`;
        }
      }
    }
  }

  writeLoopState(featureDir, state);
  appendLoopEvent(featureDir, {
    type: "run-iteration",
    iteration: state.iterations,
    phase: state.phase,
    taskId: state.activeTaskId
  });

  if (asJson) {
    console.log(JSON.stringify({ phase: state.phase, iterations: state.iterations, activeTaskId: state.activeTaskId, brief }, null, 2));
    return;
  }

  console.log(brief);
}

function taskAdd() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const title = readArg("--title");
  const pathsArg = readArg("--paths");

  if (!targetArg || !id || !title || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id && title ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);

  const trimmedTitle = title.trim();
  const existing = state.tasks.find(task => task.status !== "done" && task.title === trimmedTitle);

  if (existing) {
    console.log(`Task already tracked: ${existing.id} ${existing.title}`);
    return;
  }

  const now = new Date().toISOString();
  const task = {
    id: nextTaskId(state),
    title: trimmedTitle,
    paths: pathsArg ? pathsArg.split(",").map(value => value.trim()).filter(Boolean) : [],
    status: "pending",
    attempts: 0,
    summary: null,
    blockReason: null,
    createdAt: now,
    startedAt: null,
    updatedAt: now,
    completedAt: null
  };

  state.tasks.push(task);
  writeLoopState(featureDir, state);
  appendLoopEvent(featureDir, { type: "task-added", taskId: task.id, title: task.title, paths: task.paths });

  console.log(`Task ${task.id} added: ${task.title}`);
}

function taskVerify() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const taskId = readArg("--task");
  const summary = readArg("--summary");

  if (!targetArg || !id || !taskId || !summary || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id && taskId && summary ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featurePath, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);

  const task = findTaskOrFail(state, taskId);

  if (task.status === "done") {
    console.log(`Task ${taskId} is already done.`);
    return;
  }

  if (task.status === "blocked") {
    fail(`Task ${taskId} is blocked and cannot be verified directly.`);
  }

  if (feature.receipt) {
    const receiptPath = path.join(featureDir, feature.receipt);
    if (fs.existsSync(receiptPath)) {
      const receipt = readJsonFile(receiptPath, "Verification receipt");
      if (receipt.status === "failed") {
        console.warn(`WARNING: latest verification receipt for ${feature.id} is failed.`);
      }
    }
  }

  const now = new Date().toISOString();
  task.status = "done";
  task.summary = summary;
  task.completedAt = now;
  task.updatedAt = now;

  if (state.activeTaskId === task.id) {
    const next = state.tasks.find(candidate => candidate.status === "pending");
    state.activeTaskId = next ? next.id : null;
  }

  const hasOpenTasks = state.tasks.some(candidate => candidate.status === "pending" || candidate.status === "in-progress");
  if (!hasOpenTasks) {
    state.phase = "verifying";
    syncFeatureStatus(featurePath, feature, "verifying");
  }

  writeLoopState(featureDir, state);
  appendLoopEvent(featureDir, { type: "task-verified", taskId: task.id, summary });

  console.log(`Task ${task.id} verified: ${summary}`);
  console.log(hasOpenTasks ? "Run `homero run` to continue." : "All tasks done. Run `homero verify`, then `homero run`.");
}

function taskBlock() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const taskId = readArg("--task");
  const reason = readArg("--reason");

  if (!targetArg || !id || !taskId || !reason || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id && taskId && reason ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);

  const task = findTaskOrFail(state, taskId);

  if (task.status === "done") {
    fail(`Task ${taskId} is already done and cannot be blocked.`);
  }

  const limit = state.limits.maxAttemptsPerTask ?? config.runtime?.maxAttemptsPerTask ?? 3;
  const now = new Date().toISOString();

  task.attempts += 1;
  task.blockReason = reason;
  task.updatedAt = now;

  const terminal = task.attempts >= limit;
  task.status = terminal ? "blocked" : "pending";

  if (state.activeTaskId === task.id) {
    state.activeTaskId = null;
  }

  if (terminal) {
    const hasOpenTasks = state.tasks.some(candidate => candidate.status === "pending" || candidate.status === "in-progress");
    if (!hasOpenTasks) {
      state.phase = "blocked";
    }
  }

  writeLoopState(featureDir, state);
  appendLoopEvent(featureDir, {
    type: "task-blocked",
    taskId: task.id,
    reason,
    attempts: task.attempts,
    limit,
    terminal
  });

  if (terminal) {
    fail(`error_max_attempts_per_task: task ${task.id} reached maxAttemptsPerTask (${limit}). Marked blocked; resolve manually or split the task.`);
  }

  console.log(`Task ${task.id} blocked (attempt ${task.attempts}/${limit}); returned to queue.`);
}

function taskStatus() {
  const targetArg = readArg("--target");
  const id = readArg("--id");
  const asJson = hasFlag("--json");

  requireTargetAndId(targetArg, id);

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);
  const recentEvents = readLastEvents(featureDir, 5);

  if (asJson) {
    console.log(JSON.stringify({ state, recentEvents }, null, 2));
    return;
  }

  const verifyLimit = verifyLimitFor(state, config);
  console.log(`Feature ${feature.id}  phase=${state.phase}  iterations=${state.iterations}/${state.limits.maxIterations}  verifyAttempts=${state.verifyAttempts ?? 0}/${verifyLimit}`);

  const activeTask = state.tasks.find(task => task.id === state.activeTaskId);
  console.log(`Active task: ${activeTask ? `${activeTask.id} ${activeTask.title}` : "none"}`);

  if (state.tasks.length === 0) {
    console.log("Tasks: none yet. Add one with `homero task add`.");
  } else {
    console.log("Tasks:");
    for (const task of state.tasks) {
      console.log(`  [${task.status}] ${task.id} ${task.title} (attempts=${task.attempts}/${state.limits.maxAttemptsPerTask})`);
    }
  }

  console.log("Recent events:");
  if (recentEvents.length === 0) {
    console.log("  none");
  } else {
    for (const event of recentEvents) {
      console.log(`  ${event.at} ${event.type}`);
    }
  }
}

function task() {
  const taskCommand = commandArgs[0];

  if (taskCommand === "add") {
    taskAdd();
    return;
  }

  if (taskCommand === "verify") {
    taskVerify();
    return;
  }

  if (taskCommand === "block") {
    taskBlock();
    return;
  }

  if (taskCommand === "status") {
    taskStatus();
    return;
  }

  fail(`Unknown task command: ${taskCommand || "<missing>"}`);
}

const packageManagerInstallHints = {
  npm: "https://nodejs.org/en/download (npm ships with Node.js)",
  pnpm: "https://pnpm.io/installation",
  yarn: "https://yarnpkg.com/getting-started/install"
};

function playwrightSetupCommands(packageManager) {
  switch (packageManager) {
    case "npm":
      return {
        install: [
          ["npm", ["install", "-D", "@playwright/test", "@playwright/cli", "@axe-core/playwright"]],
          ["npx", ["playwright", "install", "chromium"]]
        ],
        cliCommand: "npx playwright-cli",
        testCommand: "npx playwright test"
      };
    case "yarn":
      return {
        install: [
          ["yarn", ["add", "-D", "@playwright/test", "@playwright/cli", "@axe-core/playwright"]],
          ["yarn", ["playwright", "install", "chromium"]]
        ],
        cliCommand: "yarn playwright-cli",
        testCommand: "yarn playwright test"
      };
    case "pnpm":
    default:
      return {
        install: [
          ["pnpm", ["add", "-D", "@playwright/test", "@playwright/cli", "@axe-core/playwright"]],
          ["pnpm", ["exec", "playwright", "install", "chromium"]]
        ],
        cliCommand: "pnpm exec playwright-cli",
        testCommand: "pnpm exec playwright test"
      };
  }
}

function setupPlaywright() {
  const targetArg = readArg("--target");
  const dryRun = hasFlag("--dry-run");

  if (!targetArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const packagePath = path.join(targetRoot, "package.json");
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(packagePath)) {
    fail("homero setup playwright requires package.json in the target repository.");
  }

  if (!fs.existsSync(configPath)) {
    fail("homero setup playwright requires a Homero-initialized repository.");
  }

  const config = readConfig(targetRoot);
  const packageManager = config.packageManager || "pnpm";

  if (!["npm", "pnpm", "yarn"].includes(packageManager)) {
    fail(
      `homero setup playwright doesn't recognize packageManager "${packageManager}" in homero.config.json ` +
        "— expected npm, pnpm, or yarn. Fix it there (or re-run `homero discover`) and try again."
    );
  }

  const { install: commands, cliCommand, testCommand } = playwrightSetupCommands(packageManager);

  // Without this, a missing package-manager binary surfaced as a generic "Playwright setup
  // failed while running: <pm> add ..." with no hint that the binary itself, not the install,
  // was the problem.
  if (!dryRun && !commandAvailable(packageManager)) {
    fail(
      `homero setup playwright requires \`${packageManager}\` on PATH (from homero.config.json's ` +
        `packageManager). Install it (${packageManagerInstallHints[packageManager]})` +
        (packageManager === "npm" ? "" : " or, on Node >=16.9, run `corepack enable`") +
        " — then try again."
    );
  }

  if (dryRun) {
    for (const [executable, commandArgs] of commands) {
      console.log(`[dry-run] ${executable} ${commandArgs.join(" ")}`);
    }
    return;
  }

  for (const [executable, commandArgs] of commands) {
    const result = spawnSync(executable, commandArgs, {
      cwd: targetRoot,
      stdio: "inherit"
    });

    if (result.status !== 0) {
      fail(`Playwright setup failed while running: ${executable} ${commandArgs.join(" ")}`);
    }
  }

  config.commands = {
    ...config.commands,
    e2e: testCommand
  };
  config.playwright = {
    ...config.playwright,
    cliCommand,
    browser: "chromium",
    testCommand
  };
  writeJsonFile(configPath, config);

  console.log(`Playwright is ready in ${targetRoot}`);
  console.log("Installed local test, CLI, and accessibility dependencies plus Chromium.");
}

function commandAvailable(executable) {
  const result = spawnSync(executable, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
}

// Records which Homero produced this install and which adapters it installed.
// Both keys are TOP-LEVEL on purpose: discoveredConfig() spreads `...config` at the top
// level, so top-level keys survive `homero discover`, while nested ones only survive if
// their parent object is explicitly spread.
//
// Without homeroClient, `validate`/`upgrade` fall back to "both" and a Claude-only repo
// gets reported as missing all 13 .github/** files — and an upgrade would install the
// entire Copilot adapter into a repo that never asked for it.
function stampConfig(targetRoot, client) {
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    return;
  }

  const config = readJsonFile(configPath, "homero.config.json");
  const previousVersion = config.homeroVersion;

  fs.writeFileSync(
    configPath,
    `${JSON.stringify({ ...config, homeroVersion, homeroClient: client }, null, 2)}\n`,
    "utf8"
  );

  if (previousVersion && previousVersion !== homeroVersion) {
    console.log(`STAMP ${configPath} (${previousVersion} -> ${homeroVersion}, client: ${client})`);
    return;
  }

  console.log(`STAMP ${configPath} (${homeroVersion}, client: ${client})`);
}

// Reads the homeroVersion constant out of a vendored CLI file without executing it.
// Executing it is not an option: `main()` treats a bare invocation as `init`, so probing
// an old copy with `--version` would run init() against the current working directory.
function vendoredCliVersion(cliPath) {
  if (!fs.existsSync(cliPath)) {
    return undefined;
  }

  const match = fs.readFileSync(cliPath, "utf8").match(/^const homeroVersion = "([^"]+)";$/m);
  return match?.[1];
}

function ensureGitignoreEntry(targetRoot, entry) {
  const gitignorePath = path.join(targetRoot, ".gitignore");
  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, "utf8") : "";

  if (existing.split(/\r?\n/).some(line => line.trim() === entry)) {
    return;
  }

  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(gitignorePath, `${existing}${separator}${entry}\n`, "utf8");
}

function setupGraphify() {
  const targetArg = readArg("--target");
  const dryRun = hasFlag("--dry-run");

  if (!targetArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    fail("homero setup graphify requires a Homero-initialized repository.");
  }

  const detectedInstaller = commandAvailable("uv") ? "uv" : commandAvailable("pipx") ? "pipx" : commandAvailable("pip") ? "pip" : null;
  const installer = detectedInstaller || "uv";

  const installCommand =
    installer === "uv"
      ? ["uv", ["tool", "install", "--upgrade", "graphifyy", "-q"]]
      : installer === "pipx"
        ? ["pipx", ["install", "graphifyy"]]
        : ["pip", ["install", "graphifyy"]];

  if (dryRun) {
    if (!detectedInstaller) {
      console.log("[dry-run] uv/pipx/pip not found on PATH — install one first (uv recommended: https://docs.astral.sh/uv/).");
    }
    console.log(`[dry-run] ${installCommand[0]} ${installCommand[1].join(" ")}`);
    console.log("[dry-run] would add graphify-out/ to .gitignore");
    console.log("[dry-run] would record graphify config in homero.config.json");
    return;
  }

  if (!detectedInstaller) {
    fail("homero setup graphify requires uv, pipx, or pip (Python 3.10+) on PATH.");
  }

  const result = spawnSync(installCommand[0], installCommand[1], {
    cwd: targetRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    fail(`graphify install failed while running: ${installCommand[0]} ${installCommand[1].join(" ")}`);
  }

  ensureGitignoreEntry(targetRoot, "graphify-out/");

  const config = readConfig(targetRoot);
  config.graphify = {
    ...config.graphify,
    installer,
    target: config.graphify?.target || "src"
  };
  writeJsonFile(configPath, config);

  console.log(`graphify is ready in ${targetRoot} (installed via ${installer}).`);
  console.log("Agents must use `graphify query` instead of broad manual file reads when exploring unfamiliar code — see docs/homero/constitution.md.");
}

function setup() {
  const setupCommand = commandArgs[0];

  if (setupCommand === "playwright") {
    setupPlaywright();
    return;
  }

  if (setupCommand === "graphify") {
    setupGraphify();
    return;
  }

  fail(`Unknown setup command: ${setupCommand || "<missing>"}`);
}

async function discover() {
  const targetArg = readArg("--target");

  if (!targetArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const force = hasFlag("--force");

  if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
    fail(`Target repo not found: ${targetRoot}`);
  }

  const config = readConfig(targetRoot);
  const answers = await collectDiscoveryAnswers(targetRoot, config);
  const nextConfig = discoveredConfig(config, answers);

  writeDiscoveredDoc(targetRoot, path.join("docs", "homero", "business.md"), businessDocument(answers), force);
  writeDiscoveredDoc(targetRoot, path.join("docs", "homero", "architecture.md"), architectureDocument(answers), force);
  writeDiscoveredDoc(targetRoot, path.join("docs", "homero", "conventions.md"), conventionsDocument(answers), force);
  writeDiscoveredDoc(targetRoot, path.join("docs", "homero", "constitution.md"), constitutionDocument(answers), force);
  writeDiscoveredDoc(targetRoot, path.join("docs", "homero", "contracts.md"), contractsDocument(answers), force);

  // The config is always written, unlike the docs above. discoveredConfig() already merges
  // into the existing config, so nothing is lost — and gating it on --force made `discover`
  // a silent no-op on every repo that had run `init` (which always creates the config).
  const configPath = path.join(targetRoot, "homero.config.json");
  const configExisted = fs.existsSync(configPath);
  fs.writeFileSync(configPath, `${JSON.stringify(nextConfig, null, 2)}\n`, "utf8");
  console.log(`${configExisted ? "WRITE" : "CREATE"} ${configPath}`);

  console.log("");
  console.log(`Homero discovery complete for ${targetRoot}`);
}

function init() {
  const targetArg = readArg("--target") || ".";
  const client = readArg("--client") || "both";

  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

  validateClient(client);
  assertSourceRepo("init");

  const targetRoot = path.resolve(targetArg);
  const projectName = readArg("--project-name") || path.basename(targetRoot);
  const force = hasFlag("--force");
  const summary = {
    created: 0,
    overwritten: 0,
    skipped: 0
  };

  fs.mkdirSync(targetRoot, { recursive: true });

  // Resolved BEFORE the copy loop: stampConfig runs at the end, and homero.config.json is
  // itself written during the loop, so neither is available yet. An existing config wins
  // so a re-init never reverts a team's model pins to the template defaults.
  const existingConfigPath = path.join(targetRoot, "homero.config.json");
  // Parsed raw, without replaceTokens: modelConfig is only ever read for agents.models pins,
  // never for projectName, so substituting the real project name first (and risking a quote
  // or backslash in it breaking the JSON before it's even parsed) buys nothing.
  const modelConfig = fs.existsSync(existingConfigPath)
    ? readJsonFile(existingConfigPath, "homero.config.json")
    : JSON.parse(fs.readFileSync(path.join(repoRoot, "templates", "core", "homero.config.json"), "utf8"));

  for (const sourceRoot of templateRootsForClient(client)) {
    if (!fs.existsSync(sourceRoot)) {
      fail(`Template root not found: ${sourceRoot}`);
    }

    copyRecursive(sourceRoot, targetRoot, { force, projectName, summary, targetRoot, modelConfig });
  }

  ensureGitignoreEntry(targetRoot, ".mcp.json");

  const cliSourcePath = fileURLToPath(import.meta.url);
  const cliDestinationPath = path.join(targetRoot, "scripts", "homero", "homero.mjs");
  const cliExisted = fs.existsSync(cliDestinationPath);

  if (!force && cliExisted) {
    summary.skipped += 1;
    console.log(`SKIP ${cliDestinationPath}`);
  } else {
    fs.mkdirSync(path.dirname(cliDestinationPath), { recursive: true });
    fs.copyFileSync(cliSourcePath, cliDestinationPath);

    if (cliExisted) {
      summary.overwritten += 1;
      console.log(`OVERWRITE ${cliDestinationPath}`);
    } else {
      summary.created += 1;
      console.log(`CREATE ${cliDestinationPath}`);
    }
  }

  // Stamped LAST: it is the only step that can fail() on a pre-existing malformed config,
  // and failing before the CLI is vendored would leave a repo with 40 template files, no
  // scripts/homero/homero.mjs, and a printed next step that cannot run.
  stampConfig(targetRoot, client);

  // Best-effort: if the repo already ran its package manager, the agent gets the real
  // component inventory from minute one instead of the "NOT GENERATED YET" placeholder.
  // Silent when the package is not there — installing before running the package manager's
  // install step (npm/pnpm/yarn) is normal.
  refreshCatalogQuietly(targetRoot);

  console.log("");
  console.log("Homero init complete");
  console.log(`Client:       ${client}`);
  console.log(`Project name: ${projectName}`);
  console.log(`Target repo:   ${targetRoot}`);
  console.log(`Created:       ${summary.created}`);
  console.log(`Overwritten:   ${summary.overwritten}`);
  console.log(`Skipped:       ${summary.skipped}`);
  console.log("");
  console.log("Next: node scripts/homero/homero.mjs discover --target .");
}

function validateConfig(targetRoot, errors) {
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    return;
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

    if (!config.projectName || typeof config.projectName !== "string") {
      errors.push("homero.config.json must include a string projectName");
    }

    if (config.schemaVersion !== 1) {
      errors.push("homero.config.json schemaVersion must be 1");
    }

    if (config.product?.portfolio !== "Falabella Seguros" || config.product?.designSystem !== "Tomaco") {
      errors.push("homero.config.json must declare Falabella Seguros and Tomaco as the required design system");
    }

    validateModelPins(config, errors);

    if (!config.commands || typeof config.commands !== "object") {
      errors.push("homero.config.json must include a commands object");
    } else {
      for (const commandName of ["lint", "typecheck", "test", "e2e"]) {
        if (!config.commands[commandName] || typeof config.commands[commandName] !== "string") {
          errors.push(`homero.config.json commands.${commandName} must be a string`);
        }
      }
    }

    if (!config.playwright?.cliCommand || typeof config.playwright.cliCommand !== "string") {
      errors.push("homero.config.json playwright.cliCommand must be a string");
    }
  } catch (error) {
    errors.push(`homero.config.json is not valid JSON: ${error.message}`);
  }
}

function validateGenerator(targetRoot, errors) {
  const generatorPath = path.join(targetRoot, "scripts", "homero", "new-form.mjs");

  if (!fs.existsSync(generatorPath)) {
    return;
  }

  const result = spawnSync(process.execPath, ["--check", generatorPath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    errors.push(`scripts/homero/new-form.mjs has a syntax error: ${(result.stderr || "").trim()}`);
  }
}

function validateCliCopy(targetRoot, errors) {
  const cliPath = path.join(targetRoot, "scripts", "homero", "homero.mjs");

  if (!fs.existsSync(cliPath)) {
    errors.push("Missing required file: scripts/homero/homero.mjs — re-run `homero init` (it copies the CLI into the target repo)");
    return;
  }

  const result = spawnSync(process.execPath, ["--check", cliPath], {
    encoding: "utf8"
  });

  if (result.status !== 0) {
    errors.push(`scripts/homero/homero.mjs has a syntax error: ${(result.stderr || "").trim()}`);
  }
}

function validate() {
  const targetArg = readArg("--target") || ".";

  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

  // Default to the client recorded at install time. Defaulting to "both" made every
  // single-adapter install fail validation with a full set of bogus "missing file" errors
  // for the adapter it deliberately did not install.
  const client = readArg("--client") || readConfig(path.resolve(targetArg)).homeroClient || "both";

  validateClient(client);
  assertSourceRepo("validate");

  const targetRoot = path.resolve(targetArg);
  const errors = [];

  if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
    fail(`Target repo not found: ${targetRoot}`);
  }

  for (const sourceRoot of templateRootsForClient(client)) {
    if (!fs.existsSync(sourceRoot)) {
      fail(`Template root not found: ${sourceRoot}`);
    }

    for (const relativePath of listFiles(sourceRoot)) {
      if (!fs.existsSync(path.join(targetRoot, relativePath))) {
        errors.push(`Missing required file: ${relativePath}`);
      }
    }
  }

  validateConfig(targetRoot, errors);
  validateGenerator(targetRoot, errors);
  validateCliCopy(targetRoot, errors);
  warnAboutCatalog(targetRoot);
  warnAboutLintGuardrail(targetRoot);

  if (errors.length > 0) {
    console.error(`Homero validation failed for ${targetRoot}`);
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log(`Homero validation OK for ${targetRoot} (${client})`);
}

function generateForm() {
  const targetArg = readArg("--target");
  const name = readArg("--name");
  const country = readArg("--country");

  if (!targetArg || !name || !country || hasFlag("--help")) {
    usage();
    process.exit(targetArg && name && country ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const generatorPath = path.join(targetRoot, "scripts", "homero", "new-form.mjs");

  if (!fs.existsSync(generatorPath)) {
    fail(`Generator not found: ${generatorPath}`);
  }

  const generatorArgs = [generatorPath, "--name", name, "--country", country];

  if (hasFlag("--force")) {
    generatorArgs.push("--force");
  }

  const result = spawnSync(process.execPath, generatorArgs, {
    cwd: targetRoot,
    stdio: "inherit"
  });

  process.exit(result.status ?? 1);
}

// Best-effort export extraction from a .d.ts bundle. Deliberately does NOT try to
// derive prop types: with no knowledge of how the design system package is built, an
// unreliable prop table read as authoritative produces exactly the confidently-wrong
// component APIs this whole catalog exists to prevent. Export names are checkable;
// inferred props are not.
function extractExportNames(declarationSource) {
  const names = new Set();
  const typeNames = new Set();

  for (const match of declarationSource.matchAll(/export\s+declare\s+(?:const|function|class|abstract\s+class)\s+([A-Za-z_$][\w$]*)/g)) {
    names.add(match[1]);
  }

  for (const match of declarationSource.matchAll(/export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)/g)) {
    typeNames.add(match[1]);
  }

  // Value vs type blocks are distinguished EXPLICITLY. Against the real tomaco-components
  // bundle, rollup-plugin-dts emits `export { ...40 components }` followed by a separate
  // `export type { ...46 prop interfaces }`, and a naive /export\s*\{/ happens to skip the
  // second only because `type` sits between `export` and `{`. Relying on that means a
  // future rollup-dts that emits one combined list would silently pollute the component
  // inventory with 46 Props names. Being explicit makes that case visible instead.
  for (const match of declarationSource.matchAll(/export\s*(type\s+)?\{([^}]*)\}/g)) {
    const typeOnlyBlock = Boolean(match[1]);

    for (const clause of match[2].split(",")) {
      const inlineType = /^\s*type\s+/.test(clause);
      const alias = clause.replace(/^\s*type\s+/, "").split(/\s+as\s+/).pop().trim();

      if (!/^[A-Za-z_$][\w$]*$/.test(alias) || alias === "default") {
        continue;
      }

      (typeOnlyBlock || inlineType ? typeNames : names).add(alias);
    }
  }

  const sortByName = (left, right) => left.localeCompare(right);
  return { values: [...names].sort(sortByName), types: [...typeNames].sort(sortByName) };
}

function resolveDeclarationFile(packageRoot, packageManifest) {
  const candidates = [
    packageManifest.types,
    packageManifest.typings,
    packageManifest.exports?.["."]?.types,
    packageManifest.exports?.["."]?.import?.types,
    packageManifest.exports?.["."]?.require?.types,
    "index.d.ts",
    "dist/index.d.ts"
  ].filter(entry => typeof entry === "string");

  for (const candidate of candidates) {
    const candidatePath = path.resolve(packageRoot, candidate);

    // An installed package's manifest is untrusted input: an absolute or "../" types
    // field would otherwise make us read a file from outside the package.
    if (!candidatePath.startsWith(packageRoot + path.sep)) {
      continue;
    }

    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return undefined;
}

function generateCatalog() {
  const targetArg = readArg("--target") || ".";

  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

  const targetRoot = path.resolve(targetArg);
  const config = readConfig(targetRoot);
  const specifier = readArg("--package") || config.product?.designSystemPackage || "tomaco-components";

  try {
    writeCatalog(targetRoot, specifier, { quiet: false });
  } catch (error) {
    fail(`Failed to generate the ${specifier} catalog: ${error.message}`);
  }
}

// Callable from init/upgrade as well as from `generate catalog`. NEVER throws and never
// exits non-zero: the catalog is an optimization, and a repo that has not run its package
// manager yet must still install and upgrade cleanly.
//
// quiet mode is for the init/upgrade path, where a "not installed" notice would be noise
// in a 40-line install log — the user has not even run their package manager's install step
// (npm/pnpm/yarn) at that point.
function writeCatalog(targetRoot, specifier, { quiet }) {
  const client = readConfig(targetRoot).homeroClient || "both";
  const outputPaths = catalogOutputPaths(targetRoot, client);

  const packageRoot = path.join(targetRoot, "node_modules", ...specifier.split("/"));
  const packageManifestPath = path.join(packageRoot, "package.json");

  if (!fs.existsSync(packageManifestPath)) {
    if (!quiet) {
      console.log(`Skipped: ${specifier} is not installed under ${targetRoot}/node_modules.`);
      console.log(`Install dependencies and re-run, or set product.designSystemPackage in homero.config.json if the specifier is wrong.`);
      console.log(`The tomaco-design-system skill keeps working — it falls back to reading the package and repo directly.`);
    }

    return;
  }

  const packageManifest = readJsonFile(packageManifestPath, `${specifier}/package.json`);
  const declarationPath = resolveDeclarationFile(packageRoot, packageManifest);
  const exports = declarationPath
    ? extractExportNames(fs.readFileSync(declarationPath, "utf8"))
    : { values: [], types: [] };
  const exportNames = exports.values;
  const subpaths = Object.keys(packageManifest.exports || {}).filter(entry => entry.startsWith("."));

  // tomaco-components hand-maintains a `tomaco` block in its own package.json: 6
  // categories and 40 components with a Spanish description and a keywords array each.
  // npm publishes package.json regardless of the `files` allowlist, so it is present in
  // every install. It beats the .d.ts export list outright for the question the skill
  // actually has to answer — "a field that masks a national ID" resolves to InputPlate
  // through keywords, and cannot be resolved from a flat list of 40 names.
  const described = packageManifest.tomaco?.components;
  const categories = packageManifest.tomaco?.categories;
  const hasDescribedCatalog = described !== null && typeof described === "object" && Object.keys(described).length > 0;

  const lines = [
    "# Tomaco component inventory",
    "",
    "<!-- GENERATED by `homero generate catalog`. Do not edit by hand. -->",
    "",
    "| | |",
    "| --- | --- |",
    `| Package | \`${specifier}\` |`,
    `| Package version | \`${packageManifest.version || "unknown"}\` |`,
    `| Generated by | Homero ${homeroVersion} |`,
    `| Source | \`${hasDescribedCatalog ? "package.json (tomaco block)" : declarationPath ? path.relative(packageRoot, declarationPath) : "no type declarations found"}\` |`,
    "",
    "**Staleness check:** if the installed package version differs from the one above,",
    "this file is stale — regenerate it before trusting any name below.",
    ""
  ];

  if (hasDescribedCatalog) {
    // Cross-check the curated block against what the bundle actually exports. A name in
    // one and not the other means the package's own metadata drifted from its build —
    // worth surfacing rather than silently trusting either side.
    const describedNames = Object.keys(described);
    const onlyDescribed = describedNames.filter(name => !exportNames.includes(name));
    const onlyExported = exportNames.filter(name => !describedNames.includes(name));

    if (exportNames.length > 0 && (onlyDescribed.length > 0 || onlyExported.length > 0)) {
      lines.push(
        "> **Drift between the package's own catalog and its build.**",
        onlyDescribed.length > 0 ? `> Described but not exported: ${onlyDescribed.map(n => `\`${n}\``).join(", ")}` : "",
        onlyExported.length > 0 ? `> Exported but not described: ${onlyExported.map(n => `\`${n}\``).join(", ")}` : "",
        "> Trust the exported side for what you can import.",
        ""
      );
    }

    lines.push("Search by need, not by category — the keywords are what make that work.", "");

    const byCategory =
      categories && typeof categories === "object"
        ? categories
        : { Components: describedNames };

    for (const [category, names] of Object.entries(byCategory)) {
      if (!Array.isArray(names) || names.length === 0) {
        continue;
      }

      lines.push(`### ${category}`, "");

      for (const name of names) {
        const entry = described[name];
        const keywords = Array.isArray(entry?.keywords) ? entry.keywords.join(", ") : "";
        lines.push(`- **\`${name}\`** — ${entry?.description || "(no description)"}`);

        if (keywords) {
          lines.push(`  <br>_${keywords}_`);
        }
      }

      lines.push("");
    }
  }

  lines.push(
    hasDescribedCatalog ? "## All exported component names" : "## Exported components",
    ""
  );

  if (exportNames.length > 0) {
    lines.push(`${exportNames.length} value exports detected.`, "");
    for (const name of exportNames) {
      lines.push(`- \`${name}\``);
    }

    if (exports.types.length > 0) {
      lines.push(
        "",
        "## Exported types",
        "",
        `${exports.types.length} type-only exports (prop interfaces and unions). Import these`,
        "with `import type` — a type-only import needs no `'use client'`.",
        ""
      );
      for (const name of exports.types) {
        lines.push(`- \`${name}\``);
      }
    }
  } else {
    lines.push(
      "No exports could be extracted — the package ships no resolvable type declarations.",
      "Read the package directly under `node_modules/` before naming any component."
    );
  }

  if (subpaths.length > 0) {
    lines.push("", "## Subpath exports", "");
    for (const subpath of subpaths) {
      lines.push(`- \`${specifier}${subpath.replace(/^\./, "")}\``);
    }
  }

  lines.push(
    "",
    "## What this file does and does not tell you",
    "",
    "It tells you **which names exist** in the installed package. That is enough to answer",
    '"does Tomaco already ship this?" and to avoid importing a component that does not exist.',
    "",
    "It does **not** list props, and that omission is deliberate — inferred prop tables read",
    "as authoritative and are wrong often enough to be worse than nothing. For the exact",
    "props of a component, read its declaration under `node_modules/` or the repo's existing",
    "usage, per your client's Tomaco design-system guidance.",
    ""
  );

  const content = lines.join("\n");

  for (const outputPath of outputPaths) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content, "utf8");
  }

  const componentCount = hasDescribedCatalog ? Object.keys(described).length : exportNames.length;

  if (quiet) {
    console.log(`CATALOG ${specifier}@${packageManifest.version || "unknown"} — ${componentCount} components`);
    return;
  }

  for (const outputPath of outputPaths) {
    console.log(`WRITE ${outputPath}`);
  }

  console.log(`${specifier}@${packageManifest.version || "unknown"} — ${componentCount} components`);
}

// init/upgrade entry point. Swallows everything: a malformed design-system manifest or an
// unreadable node_modules must never take down an install or an upgrade.
function refreshCatalogQuietly(targetRoot) {
  try {
    const specifier = readConfig(targetRoot).product?.designSystemPackage || "tomaco-components";
    writeCatalog(targetRoot, specifier, { quiet: true });
  } catch {
    // Intentionally silent — `homero generate catalog` reports properly when run directly.
  }
}

// A WARNING, never an error. A repo can legitimately have no node_modules (fresh clone,
// CI lint job), and failing validation there would punish the wrong thing. But a catalog
// recorded against a version the repo no longer installs is actively misleading — the
// agent reads it as current and names components that may have moved.
function warnAboutCatalog(targetRoot) {
  const config = readConfig(targetRoot);
  const client = config.homeroClient || "both";
  const specifier = config.product?.designSystemPackage || "tomaco-components";
  const packageManifestPath = path.join(targetRoot, "node_modules", ...specifier.split("/"), "package.json");

  if (!fs.existsSync(packageManifestPath)) {
    return;
  }

  let installedVersion;

  try {
    installedVersion = JSON.parse(fs.readFileSync(packageManifestPath, "utf8")).version;
  } catch {
    return;
  }

  for (const catalogPath of catalogOutputPaths(targetRoot, client)) {
    if (!fs.existsSync(catalogPath)) {
      console.warn(
        `WARN  The ${specifier} catalog was never generated at ${path.relative(targetRoot, catalogPath)}, but the package is installed. Run \`homero generate catalog --target .\` so agents stop falling back to memory.`
      );
      continue;
    }

    const catalog = fs.readFileSync(catalogPath, "utf8");

    if (!catalog.includes(generatedMarker)) {
      console.warn(
        `WARN  The ${specifier} catalog was never generated at ${path.relative(targetRoot, catalogPath)}, but the package is installed. Run \`homero generate catalog --target .\` so agents stop falling back to memory.`
      );
      continue;
    }

    if (installedVersion && !catalog.includes(`\`${installedVersion}\``)) {
      console.warn(
        `WARN  The ${path.relative(targetRoot, catalogPath)} catalog was generated against a different version than the installed ${installedVersion}. Run \`homero generate catalog --target .\` to refresh it.`
      );
    }
  }
}

// The lint fragment is inert until the project's own flat config imports it, and nothing
// at runtime can tell Homero whether that happened — so this check reads the project's
// eslint config directly. A warning, not an error: opting out is legitimate, and
// `lintGuardrail: "no"` in homero.config.json silences it permanently.
function warnAboutLintGuardrail(targetRoot) {
  const config = readConfig(targetRoot);

  if (config.lintGuardrail === "no") {
    return;
  }

  if (!fs.existsSync(path.join(targetRoot, "homero.eslint.config.mjs"))) {
    return;
  }

  const eslintConfigNames = [
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    "eslint.config.ts",
    "eslint.config.mts"
  ];
  const presentConfigs = eslintConfigNames.filter(name => fs.existsSync(path.join(targetRoot, name)));

  if (presentConfigs.length === 0) {
    console.warn(
      `WARN  homero.eslint.config.mjs ships the 'use client' guardrail but this repo has no flat ESLint config to import it from. Set lintGuardrail to "no" in homero.config.json to silence this.`
    );
    return;
  }

  const wired = presentConfigs.some(name =>
    fs.readFileSync(path.join(targetRoot, name), "utf8").includes("homero.eslint.config")
  );

  if (!wired) {
    console.warn(
      `WARN  homero.eslint.config.mjs is installed but ${presentConfigs.join(" / ")} does not import it, so the 'use client' guardrail is inert. Add it (snippet in the file's header), or set lintGuardrail to "no" in homero.config.json.`
    );
  }
}

// Validates the SHAPE of agents.models — not availability. Homero cannot know a team's
// Claude allowlist or their org's Copilot model policy, and both clients fail silently on
// an unavailable model, so this is the only place a typo can be caught at all.
function validateModelPins(config, errors) {
  const models = config.agents?.models;

  if (models === undefined) {
    return;
  }

  if (models === null || typeof models !== "object" || Array.isArray(models)) {
    errors.push("agents.models must be an object with `claude` and `copilot` maps");
    return;
  }

  const knownRoles = new Set([config.agents?.coordinator, ...(config.agents?.roles || [])].filter(Boolean));
  const claudeAliases = new Set(["inherit", "opus", "sonnet", "haiku", "fable"]);

  for (const client of ["claude", "copilot"]) {
    const pins = models[client];

    if (pins === undefined) {
      continue;
    }

    if (pins === null || typeof pins !== "object" || Array.isArray(pins)) {
      errors.push(`agents.models.${client} must be an object mapping agent name to model name`);
      continue;
    }

    for (const [role, value] of Object.entries(pins)) {
      if (typeof value !== "string") {
        errors.push(`agents.models.${client}.${role} must be a string ("" means: use the client default)`);
        continue;
      }

      if (knownRoles.size > 0 && !knownRoles.has(role)) {
        console.warn(`WARN  agents.models.${client}.${role} does not match any agent in agents.roles — this pin will never apply.`);
      }

      const pinned = value.trim();

      // Claude Code only resolves Claude models. A Copilot picker name such as
      // "GPT-5.6 Sol" silently falls back to the parent model there, which is exactly the
      // failure this check exists to make loud.
      if (client === "claude" && pinned && !claudeAliases.has(pinned) && !pinned.startsWith("claude-")) {
        errors.push(
          `agents.models.claude.${role} is "${pinned}", which Claude Code cannot resolve. Use ${[...claudeAliases].join("|")} or a claude-* model id.`
        );
      }
    }
  }
}

function generate() {
  const generator = commandArgs[0];

  if (generator === "form") {
    generateForm();
    return;
  }

  if (generator === "catalog") {
    generateCatalog();
    return;
  }

  fail(`Unknown generator: ${generator || "<missing>"}`);
}

// Files Homero writes at init that belong to the PROJECT, not to Homero. `upgrade` never
// overwrites these. Everything else under templates/ is Homero-authored doctrine and is
// refreshed in place.
//
// The five docs below are all produced by `discover` from the team's own answers
// (businessDocument/architectureDocument/conventionsDocument/constitutionDocument/
// contractsDocument). Overwriting architecture.md alone would silently revert a repo's
// real paths back to the generic src/ui defaults.
const userOwnedFiles = new Set([
  path.join("docs", "homero", "business.md"),
  path.join("docs", "homero", "architecture.md"),
  path.join("docs", "homero", "conventions.md"),
  path.join("docs", "homero", "contracts.md"),
  path.join("docs", "homero", "constitution.md")
]);

const mergedFiles = new Set(["homero.config.json"]);

// Ships as a placeholder but is REPLACED by `homero generate catalog` with the real
// component inventory. Treating it as managed would revert every upgrade to
// "NOT GENERATED YET" — silently reopening the exact gap the catalog exists to close.
const generatedFiles = new Set([
  path.join(".claude", "skills", "tomaco-design-system", "references", "component-api.md"),
  path.join(".github", "instructions", "tomaco-component-api.md")
]);

// Repo-root instruction files a team may plausibly have written BEFORE installing Homero.
// `init` skips existing files, so those survive install — but upgrade would happily
// overwrite them. They are only refreshed when they carry the provenance marker below,
// i.e. when Homero is demonstrably the author.
const claimableFiles = new Set([
  "AGENTS.md",
  "CLAUDE.md",
  path.join(".github", "copilot-instructions.md")
]);

const managedMarker = "homero:managed";
const generatedMarker = "GENERATED by `homero generate catalog`";

function upgradePolicyFor(relativePath, existingContent) {
  if (mergedFiles.has(relativePath)) {
    return "merge";
  }

  // Only once it has ACTUALLY been generated. While it is still the shipped placeholder,
  // it stays managed so improvements to the placeholder text reach existing repos.
  if (generatedFiles.has(relativePath)) {
    return typeof existingContent === "string" && existingContent.includes(generatedMarker) ? "generated" : "managed";
  }

  if (userOwnedFiles.has(relativePath)) {
    return "user";
  }

  if (claimableFiles.has(relativePath) && typeof existingContent === "string" && !existingContent.includes(managedMarker)) {
    return "user";
  }

  return "managed";
}

// Compare ignoring line endings. This is a PowerShell-first team; a target repo cloned
// with core.autocrlf=true has CRLF in every managed .md, and a byte comparison would
// report all 40-odd of them as changed on every single upgrade.
function sameContent(left, right) {
  return left.replace(/\r\n/g, "\n") === right.replace(/\r\n/g, "\n");
}

// Adds keys the template gained since this repo was installed, without touching a single
// value the team already set. Arrays are taken wholesale from the user side — merging them
// would reorder or duplicate entries like transport.options and agents.roles.
function mergeConfig(userConfig, templateConfig, addedKeys, prefix = "") {
  const merged = { ...userConfig };

  for (const [key, templateValue] of Object.entries(templateConfig)) {
    const dotPath = prefix ? `${prefix}.${key}` : key;

    if (!(key in userConfig)) {
      merged[key] = templateValue;
      addedKeys.push(dotPath);
      continue;
    }

    const userValue = userConfig[key];
    const bothPlainObjects =
      templateValue !== null &&
      userValue !== null &&
      typeof templateValue === "object" &&
      typeof userValue === "object" &&
      !Array.isArray(templateValue) &&
      !Array.isArray(userValue);

    if (bothPlainObjects) {
      merged[key] = mergeConfig(userValue, templateValue, addedKeys, dotPath);
    }
  }

  return merged;
}

function upgrade() {
  const targetArg = readArg("--target") || ".";
  const dryRun = hasFlag("--dry-run");
  const force = hasFlag("--force");

  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

  assertSourceRepo("upgrade");

  const targetRoot = path.resolve(targetArg);

  if (!fs.existsSync(targetRoot) || !fs.statSync(targetRoot).isDirectory()) {
    fail(`Target repo not found: ${targetRoot}`);
  }

  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    fail(
      `No homero.config.json in ${targetRoot}. Nothing to upgrade — run \`homero init --target ${targetArg}\` first.`
    );
  }

  const config = readJsonFile(configPath, "homero.config.json");
  const client = readArg("--client") || config.homeroClient || "both";
  validateClient(client);

  const installedVersion = config.homeroVersion;
  const projectName = projectNameFromConfig(targetRoot, config);

  // Refuse rather than guess. Assuming "both" on a single-adapter repo installs a whole
  // unwanted adapter as NEW files — and new files are untracked, so `git checkout .` does
  // not remove them. Guessing wrong here is the one case the undo story does not cover.
  if (!config.homeroClient && !readArg("--client")) {
    fail(
      `This repo predates homeroClient, so Homero cannot tell which adapters it was installed with.\n` +
        `Re-run with the one it uses: --client copilot, --client claude, or --client both.\n` +
        `Not sure? \`ls .github/agents .claude/agents\` — whichever exists is your answer.`
    );
  }

  // A managed-file refresh rewrites ~40 files with no rollback. Requiring a clean tree is
  // what makes the whole run revertable: `git checkout .` for modified files, plus
  // `git clean -fd` for any ADDs, which are untracked and survive a checkout.
  if (!dryRun && !force) {
    ensureCleanGitRepo(
      targetRoot,
      "homero upgrade rewrites Homero-managed files and needs a clean working tree, so the changes are reviewable and revertable. Commit or stash first, use --dry-run to preview, or --force to override.",
      "homero upgrade"
    );
  }

  console.log(
    `Homero upgrade ${installedVersion || "(unversioned)"} -> ${homeroVersion} for ${targetRoot} (${client})${dryRun ? " [dry run]" : ""}`
  );
  console.log("");

  const summary = { updated: 0, unchanged: 0, preserved: 0, conflicts: 0, added: 0 };

  for (const sourceRoot of templateRootsForClient(client)) {
    for (const relativePath of listFiles(sourceRoot)) {
      const sourcePath = path.join(sourceRoot, relativePath);
      const destinationPath = path.join(targetRoot, relativePath);

      if (mergedFiles.has(relativePath)) {
        continue;
      }

      const extension = path.extname(relativePath).toLowerCase();
      const isText = textExtensions.has(extension) || relativePath === "AGENTS.md" || relativePath === "CLAUDE.md";
      const raw = fs.readFileSync(sourcePath);
      const templateContent = isText
        ? replaceTokens(raw.toString("utf8"), projectName, {
            __HOMERO_MODEL__: agentModelLine(relativePath, config)
          })
        : raw;

      if (!fs.existsSync(destinationPath)) {
        summary.added += 1;
        console.log(`ADD       ${relativePath}`);

        if (!dryRun) {
          fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
          fs.writeFileSync(destinationPath, templateContent, isText ? "utf8" : undefined);
        }

        continue;
      }

      const existing = fs.readFileSync(destinationPath, isText ? "utf8" : undefined);
      const identical = isText
        ? sameContent(existing, templateContent)
        : Buffer.compare(existing, templateContent) === 0;

      if (identical) {
        summary.unchanged += 1;
        continue;
      }

      // Policy is decided AFTER reading the file: whether a repo-root instruction file is
      // Homero's or the team's own is only knowable from its content.
      const policy = upgradePolicyFor(relativePath, isText ? existing : undefined);

      // A generated artifact that has already been generated. Leave it entirely alone —
      // writing a .homero-new placeholder next to a real inventory would be pure noise.
      if (policy === "generated") {
        summary.preserved += 1;
        console.log(`KEEP      ${relativePath} (generated — refresh with \`homero generate catalog\`)`);
        continue;
      }

      // User-owned file that drifted from the shipped template. Never overwrite it —
      // write the new version alongside so a human can diff and merge deliberately.
      if (policy === "user") {
        summary.conflicts += 1;
        console.log(`REVIEW    ${relativePath} -> ${relativePath}.homero-new`);

        if (!dryRun) {
          fs.writeFileSync(`${destinationPath}.homero-new`, templateContent, isText ? "utf8" : undefined);
        }

        continue;
      }

      summary.updated += 1;
      console.log(`UPDATE    ${relativePath}`);

      if (!dryRun) {
        fs.writeFileSync(destinationPath, templateContent, isText ? "utf8" : undefined);
      }
    }
  }

  // `init` adds this, but a repo installed before that existed (or one that lost the line some
  // other way) had no way to get it back short of a full re-init — upgrade should heal it too.
  if (!dryRun) {
    ensureGitignoreEntry(targetRoot, ".mcp.json");
  }

  // Parsed raw, without replaceTokens: mergeConfig() only ever takes templateConfig's
  // projectName when the target config doesn't already have one, which upgrade's target always
  // does — so substituting the real project name first buys nothing and risks a quote or
  // backslash in it breaking the JSON before it's even parsed.
  const templateConfig = JSON.parse(
    fs.readFileSync(path.join(repoRoot, "templates", "core", "homero.config.json"), "utf8")
  );
  const addedKeys = [];
  const nextConfig = mergeConfig(config, templateConfig, addedKeys);

  if (addedKeys.length > 0) {
    console.log(`CONFIG    added ${addedKeys.length} new key(s): ${addedKeys.join(", ")}`);
  }

  if (!dryRun) {
    fs.writeFileSync(
      configPath,
      `${JSON.stringify({ ...nextConfig, homeroVersion, homeroClient: client }, null, 2)}\n`,
      "utf8"
    );
  }

  // Refresh the vendored CLI last, and never while running as that same file.
  const cliSourcePath = fileURLToPath(import.meta.url);
  const cliDestinationPath = path.join(targetRoot, "scripts", "homero", "homero.mjs");

  if (path.resolve(cliSourcePath) === path.resolve(cliDestinationPath)) {
    console.log("CLI       skipped (running as the vendored copy)");
  } else {
    const installedCliVersion = vendoredCliVersion(cliDestinationPath);

    if (installedCliVersion === homeroVersion) {
      console.log(`CLI       already ${homeroVersion}`);
    } else {
      console.log(`CLI       ${installedCliVersion || "(unversioned)"} -> ${homeroVersion}`);

      if (!dryRun) {
        // Write to a temp file then rename: a half-written homero.mjs would leave the repo
        // with no working CLI and no way to re-run the upgrade.
        const temporaryPath = `${cliDestinationPath}.homero-tmp`;
        fs.mkdirSync(path.dirname(cliDestinationPath), { recursive: true });
        fs.copyFileSync(cliSourcePath, temporaryPath);
        fs.renameSync(temporaryPath, cliDestinationPath);
      }
    }
  }

  // Refresh the catalog against whatever version is installed today. Safe to do
  // unconditionally: it regenerates from node_modules, so it cannot stale-ify anything,
  // and it is exactly what a post-Tomaco-bump upgrade should pick up.
  if (!dryRun) {
    refreshCatalogQuietly(targetRoot);
  }

  console.log("");
  console.log(`Updated:      ${summary.updated}`);
  console.log(`Added:        ${summary.added}`);
  console.log(`Unchanged:    ${summary.unchanged}`);
  console.log(`Kept:         ${summary.preserved}`);
  console.log(`Needs review: ${summary.conflicts}`);

  if (!dryRun && (summary.updated > 0 || summary.added > 0)) {
    console.log("");
    console.log(
      summary.added > 0
        ? "To revert this run: `git checkout .` for the updates, `git clean -fd` for the new files."
        : "To revert this run: `git checkout .`"
    );
  }

  if (summary.conflicts > 0) {
    console.log("");
    console.log(
      `Some project-owned files drifted from the shipped templates. Homero ${dryRun ? "would write" : "wrote"} the`
    );
    console.log("new version next to each as <file>.homero-new — diff, merge what you want, then delete.");
  }

  if (dryRun) {
    console.log("");
    console.log("Dry run: nothing was written. Re-run without --dry-run to apply.");
  }
}

function version() {
  const targetArg = readArg("--target");

  console.log(`homero ${homeroVersion}`);

  if (!targetArg) {
    return;
  }

  const targetRoot = path.resolve(targetArg);
  const config = readConfig(targetRoot);
  const installedCliVersion = vendoredCliVersion(path.join(targetRoot, "scripts", "homero", "homero.mjs"));

  console.log(`target:        ${targetRoot}`);
  console.log(`config:        ${config.homeroVersion || "(unversioned)"}`);
  console.log(`vendored CLI:  ${installedCliVersion || "(not installed)"}`);
  console.log(`client:        ${config.homeroClient || "(unrecorded)"}`);

  if (installedCliVersion && config.homeroVersion && installedCliVersion !== config.homeroVersion) {
    console.log("");
    console.log(
      `WARN  scripts/homero/homero.mjs is ${installedCliVersion} but homero.config.json says ${config.homeroVersion}. Run \`homero upgrade --target ${targetArg}\`.`
    );
  }
}

async function main() {
  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

  if (!command || command === "init") {
    init();
    return;
  }

  if (command === "discover") {
    await discover();
    return;
  }

  if (command === "validate") {
    validate();
    return;
  }

  if (command === "upgrade") {
    upgrade();
    return;
  }

  if (command === "version") {
    version();
    return;
  }

  if (command === "generate") {
    generate();
    return;
  }

  if (command === "feature") {
    feature();
    return;
  }

  if (command === "verify") {
    verifyFeature();
    return;
  }

  if (command === "run") {
    runLoop();
    return;
  }

  if (command === "task") {
    task();
    return;
  }

  if (command === "setup") {
    setup();
    return;
  }

  fail(`Unknown command: ${command}`);
}

main();