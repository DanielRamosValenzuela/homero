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
- `mcp.example.json`

This layer defines the portable contract for the repo. It must not depend on a
specific AI client directory such as `.claude` or `.github`.

### 2. Client adapters

Copilot adapter:

- `.github/copilot-instructions.md`
- `.github/instructions/*.instructions.md`
- `.github/agents/*.agent.md`

Claude adapter:

- `.claude/agents/*.md`
- `.claude/rules/forms.md`
- `.claude/rules/tomaco.md`
- `.claude/rules/server-actions.md`
- `.claude/skills/new-form/`
- `.claude/skills/new-step/`
- `.claude/skills/figma-to-component/`

Adapters translate the same Homero contract into client-specific instruction
surfaces. Copilot is first-class today; Claude remains supported without making
`.claude` part of the core install.

Workflow roles are defined in `docs/homero/agent-roles.md`. Concrete custom
agents are adapter-level because each AI client has its own agent file format and
tooling semantics.

### 3. Deterministic scaffold layer

- `scripts/homero/new-form.mjs`

This layer exists only for patterns where AI drift is expensive.

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
homero discover --target <repo>
homero validate --target <repo> --client copilot|claude|both
homero generate form --target <repo> --name <FormName> --country <cl|pe|co>
```

`homero discover` is the first step toward the full harness lifecycle. It asks
for stack and business context, then writes `docs/homero/business.md`,
`docs/homero/architecture.md`, `docs/homero/conventions.md`,
`docs/homero/constitution.md`, `docs/homero/contracts.md`, and
`homero.config.json`. Contract discovery lets the frontend team generate
realistic mocks from a final contract, draft contract, or explicitly recorded
no-contract exception.

## Non-goals for v0.1

- Full multi-agent orchestration
- Runtime hook enforcement
- Automatic Figma auth bootstrap
- Migrations for existing projects
- Published package registry workflow

Those can be added after the first internal feedback cycle.
