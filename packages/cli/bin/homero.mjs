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
  console.log(`Usage:
  homero init --target <repo> --client <copilot|claude|both> [--project-name <name>] [--force]
  homero discover --target <repo> [--defaults] [--force]
  homero validate --target <repo> [--client <copilot|claude|both>]
  homero generate form --target <repo> --name <FormName> --country <cl|pe|co> [--force]`);
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

function readConfig(targetRoot) {
  const configPath = path.join(targetRoot, "homero.config.json");

  if (!fs.existsSync(configPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8"));
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
    framework: "Next.js App Router",
    runtime: "Node.js",
    formStack: "React Hook Form + Zod",
    designSystem: "Tomaco",
    stylingException: "none",
    dataStack: "TanStack Query for reads and Server Actions for writes",
    stateStack: "Zustand only for cross-step client state",
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
    testCommand: config.commands?.test || "pnpm test"
  };
}

const discoveryFields = [
  ["projectName", "Project name"],
  ["projectStatus", "Project status: new starter, existing repo, or brownfield migration"],
  ["framework", "Framework/runtime stack"],
  ["runtime", "Runtime"],
  ["formStack", "Form stack"],
  ["designSystem", "Design system"],
  ["stylingException", "Styling exception, if any"],
  ["dataStack", "Data fetching and write stack"],
  ["stateStack", "Client state stack"],
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
  ["testCommand", "Test command"]
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

## Frontend boundaries

### UI

- UI lives under \`src/ui/\` unless the repo records another path in \`homero.config.json\`.
- Country-specific UI may live under \`src/ui/{country}/\`.
- Repeated form patterns should keep \`schema.ts\`, \`use*.ts\`, and \`index.tsx\` together.

### Routing and steps

- Step routes live under the app routing layer selected by the repo.
- A step owns orchestration, not all field logic.
- Form logic should stay close to the form itself.

### Data and transport

- Read flows should follow the selected data stack.
- Write flows should not leak backend details to the client layer.
- Sensitive transport and logging belong on the server boundary.
- Backend-dependent UI should use recorded contracts or draft fixtures so frontend work can proceed independently.

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
`;
}

function conventionsDocument(answers) {
  return `# Frontend conventions

Generated by \`homero discover\`.

## Design system

- Default design system: ${answers.designSystem}
- Styling exception: ${answers.stylingException}
- Prefer existing project layout classes, tokens, and components before custom CSS.
- Do not introduce another design system without updating \`docs/homero/constitution.md\`.

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

## Naming

- Component directories: PascalCase.
- Hooks: \`useX\`.
- Schemas: \`schema\`.
- Inferred value types: \`<FormName>Values\`.
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

## Governing principles

1. Business intent comes before implementation details.
2. Figma is the primary design and UX input, but unclear business behavior must be clarified.
3. ${answers.designSystem} is the default design system for this repo.
4. Styling exceptions are allowed only when explicitly recorded. Current exception: ${answers.stylingException}.
5. Forms must use the selected stack: ${answers.formStack}.
6. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-contract exception.
7. Mocks must be realistic, anonymized, and traceable to a contract source or recorded assumption.
8. Feature work must produce a spec, plan, task list, and verification evidence when scope is non-trivial.
9. The AI agent must ask about blocking ambiguity before implementing.
10. The AI agent should implement without extra confirmation when the spec and plan are complete.
11. Verification commands in \`homero.config.json\` are part of the definition of done.

## Rejection criteria

A feature plan or implementation should be rejected if it:

- contradicts the selected design system without an explicit exception
- invents business rules that were not specified or confirmed
- invents backend payloads without recording a contract mode or draft assumption
- copies raw Figma or Tailwind output without adapting it to the project
- skips required validation for forms or server boundaries
- lacks an executable verification path
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
      test: answers.testCommand
    },
    discovery: {
      projectStatus: answers.projectStatus,
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
  const targetArg = readArg("--target");
  const client = readArg("--client") || "copilot";

  if (!targetArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg ? 0 : 1);
  }

  validateClient(client);

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

  console.log("");
  console.log("Homero init complete");
  console.log(`Client:       ${client}`);
  console.log(`Project name: ${projectName}`);
  console.log(`Target repo:   ${targetRoot}`);
  console.log(`Created:       ${summary.created}`);
  console.log(`Overwritten:   ${summary.overwritten}`);
  console.log(`Skipped:       ${summary.skipped}`);
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

    if (!config.commands || typeof config.commands !== "object") {
      errors.push("homero.config.json must include a commands object");
    } else {
      for (const commandName of ["lint", "typecheck", "test"]) {
        if (!config.commands[commandName] || typeof config.commands[commandName] !== "string") {
          errors.push(`homero.config.json commands.${commandName} must be a string`);
        }
      }
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

function validate() {
  const targetArg = readArg("--target");
  const client = readArg("--client") || "copilot";

  if (!targetArg || hasFlag("--help")) {
    usage();
    process.exit(targetArg ? 0 : 1);
  }

  validateClient(client);

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
  if (!command || hasFlag("--help")) {
    usage();
    process.exit(command ? 0 : 1);
  }

  if (command === "init") {
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

  fail(`Unknown command: ${command}`);
}

main();