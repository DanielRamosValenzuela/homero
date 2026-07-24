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

function readArg(name) {
  const index = commandArgs.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return commandArgs[index + 1];
}

function hasFlag(name) {
  return commandArgs.includes(name) || args.includes(name);
}

function usage() {
  console.log(`Install (run once, in your repo root):
  npx github:DanielRamosValenzuela/homero

That defaults to \`init --target . --client both\` and copies the CLI to
scripts/homero/homero.mjs. Every command below except init/validate then
runs from that copy: \`node scripts/homero/homero.mjs <command> ...\`.
\`init\`/\`validate\` need the Homero source template, so they run via
\`npx github:DanielRamosValenzuela/homero <command> ...\` instead.

Usage:
  homero init [--target <repo>] [--client <copilot|claude|both>] [--project-name <name>] [--force]
  homero discover --target <repo> [--defaults] [--force]
  homero validate [--target <repo>] [--client <copilot|claude|both>]
  homero generate form --target <repo> --name <FormName> --country <cl|pe|co> [--force]
  homero feature create --target <repo> --id <id> --name <name> --figma <url> --figma-version <version> --contract-mode <contract-first|contract-draft|no-backend-exception> --countries <cl|cl,pe,...> [--contract-source <source>] [--contract-exception <reason>]
  homero feature check --target <repo> --id <id>
  homero verify --target <repo> --id <id>
  homero run --target <repo> --id <id>
  homero task add --target <repo> --id <id> --title <title> [--paths <path,...>]
  homero task verify --target <repo> --id <id> --task <task-id> --summary <summary>
  homero task block --target <repo> --id <id> --task <task-id> --reason <reason>
  homero task status --target <repo> --id <id>
  homero setup playwright --target <repo> [--dry-run]
  homero setup graphify --target <repo> [--dry-run]`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function replaceTokens(content, projectName) {
  return content.replaceAll("__PROJECT_NAME__", projectName);
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
      fs.writeFileSync(destinationPath, replaceTokens(content.toString("utf8"), options.projectName), "utf8");
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

function assertSourceRepo(commandName) {
  if (!fs.existsSync(path.join(repoRoot, "templates"))) {
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

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function writeJsonFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function readJsonFile(filePath, description) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    fail(`${description} is not valid JSON: ${error.message}`);
  }
}

function writeTextFile(targetRoot, relativePath, content, force) {
  const destinationPath = path.join(targetRoot, relativePath);
  const existed = fs.existsSync(destinationPath);

  if (existed && !force) {
    console.log(`SKIP ${destinationPath}`);
    return;
  }

  fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
  fs.writeFileSync(destinationPath, content, "utf8");
  console.log(`${existed ? "WRITE" : "CREATE"} ${destinationPath}`);
}

function projectNameFromConfig(targetRoot, config) {
  return config.projectName || path.basename(targetRoot);
}

function discoveryDefaults(targetRoot, config) {
  return {
    projectName: projectNameFromConfig(targetRoot, config),
    projectStatus: "existing frontend repo",
    monorepo: config.discovery?.monorepo || "no",
    framework: "Next.js App Router",
    runtime: "Node.js",
    formStack: "React Hook Form + Zod",
    designSystem: "Tomaco",
    stylingException: "none",
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
    lintCommand: config.commands?.lint || "pnpm lint",
    typecheckCommand: config.commands?.typecheck || "pnpm exec tsc --noEmit",
    testCommand: config.commands?.test || "pnpm test",
    e2eCommand: config.commands?.e2e || "pnpm exec playwright test"
  };
}

const discoveryFields = [
  ["projectName", "Project name"],
  ["projectStatus", "Project status: new starter, existing repo, or brownfield migration"],
  ["monorepo", "Is this repo a monorepo? If yes, run `homero init`/`discover` again per app with --target pointing at that app's folder (e.g. apps/web), not the workspace root"],
  ["framework", "Framework/runtime stack"],
  ["runtime", "Runtime"],
  ["formStack", "Form stack"],
  ["designSystem", "Design system"],
  ["stylingException", "Styling exception, if any"],
  ["dataStack", "Data fetching and write stack"],
  ["stateStack", "Client state stack"],
  ["uiRoot", "UI/forms root path, relative to --target (default src/ui)"],
  ["stepRoot", "Step/route root path, relative to --target (default src/app)"],
  ["serverActionsRoot", "Server actions/transport root path, relative to --target (default src/actions)"],
  ["storesRoot", "Client state store root path, relative to --target (default src/store)"],
  ["widgetsRoot", "Shared cross-step widgets root path, relative to --target (default src/widgets)"],
  ["testRoot", "Test root path, relative to --target (default test)"],
  ["countries", "Countries or variants in scope"],
  ["figmaSource", "Figma source of truth"],
  ["contractMode", "Backend contract mode: contract-first, contract-draft, or no-contract-exception"],
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

## Discovery inputs required before coding

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

## Figma source

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

- Figma source: ${answers.figmaSource}
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
- introduces a new shared widget or component that duplicates one already available under \`paths.widgetsRoot\` or an existing design-system pattern
`;
}

function discoveredConfig(config, answers) {
  return {
    ...config,
    projectName: answers.projectName,
    packageManager: config.packageManager || "pnpm",
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
      projectStatus: answers.projectStatus,
      monorepo: answers.monorepo,
      countries: answers.countries,
      figmaSource: answers.figmaSource,
      businessGoal: answers.businessGoal,
      successState: answers.successState,
      stakeholders: answers.stakeholders
    },
    stack: {
      framework: answers.framework,
      runtime: answers.runtime,
      forms: answers.formStack,
      designSystem: answers.designSystem,
      stylingException: answers.stylingException,
      data: answers.dataStack,
      state: answers.stateStack
    },
    contracts: {
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

function featureWorktreePath(targetRoot, id, config) {
  const worktreeRoot = config.workspace?.worktreeRoot || "../.homero-worktrees";
  return path.join(path.resolve(targetRoot, worktreeRoot), path.basename(targetRoot), id);
}

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
      uiStates: [
        "loading",
        "success",
        "empty",
        "validation-error",
        "business-error",
        "server-error"
      ],
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
      maxAttemptsPerTask: config.runtime?.maxAttemptsPerTask ?? 3
    },
    iterations: 0,
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

function readLastEvents(featureDir, count) {
  const eventsPath = path.join(featureDir, "events.ndjson");

  if (!fs.existsSync(eventsPath)) {
    return [];
  }

  const lines = fs.readFileSync(eventsPath, "utf8").split("\n").filter(Boolean);
  return lines.slice(-count).map(line => JSON.parse(line));
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

function ensureCleanGitRepo(targetRoot) {
  if (gitText(targetRoot, ["rev-parse", "--is-inside-work-tree"]) !== "true") {
    fail("homero feature create requires a Git repository.");
  }

  const workingTree = gitText(targetRoot, ["status", "--porcelain"]);
  if (workingTree === null) {
    fail("Could not inspect the Git working tree.");
  }

  if (workingTree) {
    fail("homero feature create requires a clean working tree to keep the feature branch isolated.");
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
  }

  if (!Array.isArray(feature.requirements?.openQuestions) || feature.requirements.openQuestions.length > 0) {
    errors.push("feature has unresolved open questions");
  }

  if (!Array.isArray(feature.verification?.required) || ![...requiredChecks].every(check => feature.verification.required.includes(check))) {
    errors.push("feature verification must require lint, typecheck, test, e2e, and playwright-cli evidence");
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
  const directFeaturePath = path.join(targetRoot, "features", id, "feature.json");
  if (fs.existsSync(directFeaturePath)) {
    return targetRoot;
  }

  const result = git(targetRoot, ["worktree", "list", "--porcelain"]);
  if (result.status !== 0) {
    fail("Could not inspect Git worktrees for the requested feature.");
  }

  const worktrees = result.stdout
    .split("\n")
    .filter(line => line.startsWith("worktree "))
    .map(line => line.slice("worktree ".length));

  for (const worktree of worktrees) {
    if (fs.existsSync(path.join(worktree, "features", id, "feature.json"))) {
      return worktree;
    }
  }

  fail(`Feature ${id} was not found in this repository or its worktrees.`);
}

function featureCheck(targetRoot, id) {
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const errors = [
    ...featureErrors(workspaceRoot, feature),
    ...playwrightEvidenceErrors(featureDir, feature)
  ];

  if (errors.length > 0) {
    return { feature, featureDir, workspaceRoot, errors };
  }

  return { feature, featureDir, workspaceRoot, errors: [] };
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
  const worktreePath = featureWorktreePath(targetRoot, id, config);

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

  if (fs.existsSync(worktreePath)) {
    fail(`Feature worktree already exists: ${worktreePath}`);
  }

  if (fs.existsSync(path.join(targetRoot, "features", id))) {
    fail(`Feature artifacts already exist for ${id}.`);
  }

  ensureCleanGitRepo(targetRoot);

  const branch = `feature/${id}-${slugify(name)}`;
  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  const worktreeResult = git(targetRoot, ["worktree", "add", "-b", branch, worktreePath, "HEAD"]);
  if (worktreeResult.status !== 0) {
    fail(`Could not create worktree for ${branch}: ${worktreeResult.stderr.trim()}`);
  }

  const paths = featurePaths(worktreePath, id, name);

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
    branch,
    worktree: worktreePath
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

  console.log(`Feature ${id} created on ${branch}`);
  console.log(`Worktree: ${worktreePath}`);
  console.log(`Contract: ${path.relative(worktreePath, paths.featurePath)}`);
  console.log(`Spec: ${path.relative(worktreePath, path.join(paths.specDir, "spec.md"))}`);
  console.log("The feature remains draft until Homero gates pass.");
}

function featureCheckCommand() {
  const targetArg = readArg("--target");
  const id = readArg("--id");

  if (!targetArg || !id || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id ? 0 : 1);
  }

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

  if (!targetArg || !id || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const config = readConfig(targetRoot);
  const { workspaceRoot, featurePath, featureDir, feature } = readFeature(targetRoot, id);
  const workspaceConfig = readConfig(workspaceRoot);
  const gateErrors = [
    ...featureErrors(workspaceRoot, feature),
    ...playwrightEvidenceErrors(featureDir, feature)
  ];

  if (gateErrors.length > 0) {
    console.error(`Feature ${id} cannot be verified:`);
    for (const error of gateErrors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
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

  if (!passed) {
    console.error(`Feature ${id} verification failed. Receipt: ${path.relative(targetRoot, receiptPath)}`);
    process.exit(1);
  }

  console.log(`Feature ${id} verification passed. Receipt: ${path.relative(targetRoot, receiptPath)}`);
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

  if (!targetArg || !id || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featurePath, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);

  const contractErrors = featureErrors(workspaceRoot, feature);
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
      const receiptPath = feature.receipt ? path.join(featureDir, feature.receipt) : null;
      const receipt = receiptPath && fs.existsSync(receiptPath) ? readJsonFile(receiptPath, "Verification receipt") : null;

      if (receipt && receipt.status === "passed") {
        state.phase = "needs-review";
        syncFeatureStatus(featurePath, feature, "needs-review");
        brief = "Verification passed. Awaiting human review; do not self-accept.";
      } else {
        state.phase = "verifying";
        syncFeatureStatus(featurePath, feature, "verifying");
        brief = "All tasks done. Run `homero verify`, then `homero run` again.";
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

  const task = state.tasks.find(candidate => candidate.id === taskId);
  if (!task) {
    fail(`Task not found: ${taskId}`);
  }

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

  const task = state.tasks.find(candidate => candidate.id === taskId);
  if (!task) {
    fail(`Task not found: ${taskId}`);
  }

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

  if (!targetArg || !id || hasFlag("--help")) {
    usage();
    process.exit(targetArg && id ? 0 : 1);
  }

  const targetRoot = path.resolve(targetArg);
  const { workspaceRoot, featureDir, feature } = readFeature(targetRoot, id);
  const config = readConfig(workspaceRoot);
  const state = ensureLoopState(featureDir, feature, config);
  const recentEvents = readLastEvents(featureDir, 5);

  if (asJson) {
    console.log(JSON.stringify({ state, recentEvents }, null, 2));
    return;
  }

  console.log(`Feature ${feature.id}  phase=${state.phase}  iterations=${state.iterations}/${state.limits.maxIterations}`);

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
  if ((config.packageManager || "pnpm") !== "pnpm") {
    fail("homero setup playwright currently supports repositories configured with pnpm.");
  }

  const commands = [
    ["pnpm", ["add", "-D", "@playwright/test", "@playwright/cli", "@axe-core/playwright"]],
    ["pnpm", ["exec", "playwright", "install", "chromium"]]
  ];

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
    e2e: "pnpm exec playwright test"
  };
  config.playwright = {
    ...config.playwright,
    cliCommand: "pnpm exec playwright-cli",
    browser: "chromium",
    testCommand: "pnpm exec playwright test"
  };
  writeJsonFile(configPath, config);

  console.log(`Playwright is ready in ${targetRoot}`);
  console.log("Installed local test, CLI, and accessibility dependencies plus Chromium.");
}

function commandAvailable(executable) {
  const result = spawnSync(executable, ["--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
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

  writeTextFile(targetRoot, path.join("docs", "homero", "business.md"), businessDocument(answers), force);
  writeTextFile(targetRoot, path.join("docs", "homero", "architecture.md"), architectureDocument(answers), force);
  writeTextFile(targetRoot, path.join("docs", "homero", "conventions.md"), conventionsDocument(answers), force);
  writeTextFile(targetRoot, path.join("docs", "homero", "constitution.md"), constitutionDocument(answers), force);
  writeTextFile(targetRoot, path.join("docs", "homero", "contracts.md"), contractsDocument(answers), force);
  writeTextFile(targetRoot, "homero.config.json", `${JSON.stringify(nextConfig, null, 2)}\n`, force);

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

  for (const sourceRoot of templateRootsForClient(client)) {
    if (!fs.existsSync(sourceRoot)) {
      fail(`Template root not found: ${sourceRoot}`);
    }

    copyRecursive(sourceRoot, targetRoot, { force, projectName, summary });
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
    errors.push(`scripts/homero/new-form.mjs has a syntax error: ${result.stderr.trim()}`);
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
    errors.push(`scripts/homero/homero.mjs has a syntax error: ${result.stderr.trim()}`);
  }
}

function validate() {
  const targetArg = readArg("--target") || ".";
  const client = readArg("--client") || "both";

  if (hasFlag("--help")) {
    usage();
    process.exit(0);
  }

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

function generate() {
  const generator = commandArgs[0];

  if (generator === "form") {
    generateForm();
    return;
  }

  fail(`Unknown generator: ${generator || "<missing>"}`);
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