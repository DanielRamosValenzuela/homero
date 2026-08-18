# Homero architecture

## Goal

Homero is a frontend-specialized harness for Falabella Seguros projects. It must
help an AI agent:

1. ask better discovery questions
2. map design intent to Tomaco-friendly implementations
3. request backend contracts or draft fixtures for independent frontend work
4. avoid repeated structural drift in multi-file frontend work
5. keep the repo verifiable and reviewable

## Layers

### 1. Harness core

- `AGENTS.md`
- `CLAUDE.md`
- `docs/homero/*.md`
- `specs/_template/*.md`
- `homero.config.json`
- `homero.eslint.config.mjs` (opt-in lint fragment, inert until the target repo imports it)
- `mcp.example.json`

This layer defines the portable contract for the repo. It must not depend on a
specific AI client directory such as `.claude` or `.github`.

### 2. Client adapters

Copilot adapter:

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md` (rules) plus `tomaco-component-api.md`
  and `tomaco-component-gotchas.md` (plain reference docs, no `applyTo`)
- `.github/agents/*.agent.md`
- `.github/prompts/homero.prompt.md`, `homero-discover.prompt.md`,
  `homero-plan.prompt.md`, `homero-implement.prompt.md`,
  `homero-review-plan.prompt.md`

Claude adapter:

- `.claude/commands/homero.md`, `homero-discover.md`, `homero-plan.md`,
  `homero-implement.md`, `homero-review-plan.md`
- `.claude/agents/*.md`
- `.claude/rules/*.md` (forms, frontend, tomaco, server-actions, step-widgets, transport-patterns)
- `.claude/skills/new-form/`, `.claude/skills/new-step/`, `.claude/skills/figma-to-component/`
- `.claude/skills/seguros-falabella-ui-ux/`, `.claude/skills/tomaco-design-system/`

Both adapters are first-class and kept at content parity by hand: the same 7
agent roles, the same rules, and the same two design-system skills exist on
both sides, translated into each client's own format (Claude skills vs.
Copilot `applyTo`-triggered instructions — Copilot has no skills concept, so
its equivalents are plain instruction files referenced by path instead of
invoked by name). `homero validate`/`upgrade` only check that a client's own
template tree is present in the target repo; they do not check cross-client
parity. `scripts/self-test.mjs` runs a structural pairing check (every rule
topic — forms, frontend, server-actions/transport, step-widgets, the two
design-system skills — has a file on both sides) so a whole topic silently
missing on one adapter fails CI; it cannot verify the two sides say the same
thing, so wording-level content parity is still a manual-authoring invariant.

Workflow roles are defined in `docs/homero/agent-roles.md`. Concrete custom
agents are adapter-level because each AI client has its own agent file format and
tooling semantics.

### 3. Deterministic scaffold layer

- `scripts/homero/new-form.mjs`
- `generate catalog` (a CLI command, not a copied script — regenerates the
  Tomaco component inventory from the installed package, client-aware)

This layer exists only for patterns where AI drift is expensive, or where a
generated artifact needs to reflect the currently-installed design-system
version rather than a hand-maintained guess.

### 4. CLI and validation layer

- `packages/cli/bin/homero.mjs`
- `scripts/bootstrap-harness.mjs`
- `scripts/validate-harness.mjs`
- `scripts/self-test.mjs`

The CLI installs layered templates, validates required files by client, and
delegates generation to the local scripts installed in the target repo. The
scripts under `scripts/` are compatibility wrappers or tests around the CLI.

## Commands

```powershell
homero init --target <repo> --client copilot|claude|both
homero upgrade --target <repo> [--client copilot|claude|both] [--dry-run] [--force]
homero version --target <repo>
homero discover --target <repo> [--defaults] [--force]
homero validate --target <repo> [--client copilot|claude|both]
homero generate form --target <repo> --name <FormName> --country <cl|pe|co>
homero generate catalog --target <repo> [--package <specifier>]
homero feature create --target <repo> --id <id> --name <name> --figma <url> --figma-version <version> --contract-mode <mode> --countries <cl,pe,...>
homero feature check --target <repo> --id <id>
homero verify --target <repo> --id <id>
homero run --target <repo> --id <id>
homero task add|verify|block|status --target <repo> --id <id> ...
homero setup playwright|graphify --target <repo> [--dry-run]
```

Run `homero <command> --help` (or see `packages/cli/bin/homero.mjs`'s
`usage()`) for the authoritative flag list — the block above is a summary, not
the source of truth. `usage()` names every command's flags directly except
`discover`'s ~35 per-field questions, which it points at
`docs/homero/ai-workflow.md` for rather than enumerating inline.

`homero discover` is the first step toward the full harness lifecycle. It asks
for stack and business context, then writes `docs/homero/business.md`,
`docs/homero/architecture.md`, `docs/homero/conventions.md`,
`docs/homero/constitution.md`, `docs/homero/contracts.md`, and
`homero.config.json`. Contract discovery lets the frontend team generate
realistic mocks from a final contract, draft contract, or explicitly recorded
no-backend exception. There is no separate `homero constitution`/`specify`/
`plan`/`tasks`/`implement`/`converge` command — see
`docs/ai-harness-strategy.md`'s "Target lifecycle" section for how that
aspirational model maps onto the commands that actually exist.

## Non-goals (current)

- Full multi-agent orchestration (agents are separate files run in separate
  sessions/delegations; there is no runtime that coordinates them for you)
- Runtime hook enforcement (guardrails are prompts + the CLI's own checks, not
  editor/IDE hooks)
- Automatic Figma auth bootstrap
- Published package registry workflow (distribution stays `npx github:...`;
  `package.json` is `private: true`)

Migrating an existing Homero install is no longer a non-goal — `homero
upgrade` covers it (see the CLI's own `usage()` text and README's "Actualizar
una instalación" section).
