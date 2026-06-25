# Homero

Homero is an AI harness for Falabella Seguros frontend projects.

It is not a generic coding harness. It is optimized for:

- React + Next.js App Router
- TypeScript strict mode
- Tomaco as the design system
- React Hook Form + Zod
- TanStack Query + Server Actions
- Figma-driven UI work with human verification
- contract-driven mocks for frontend independence before backend integration

## Architecture choice

Homero uses a **CLI-first hybrid model**:

1. **AGENTS.md + docs** for persistent project context
2. **Client adapters** for Copilot and Claude-specific behavior
3. **Optional skills/rules** for reusable frontend procedures
4. **Custom agents** for role-based AI workflow orchestration
5. **A small scaffold CLI** for deterministic multi-file patterns

This keeps the process layer and the product layer separate:

- Homero defines **how the AI works**
- Each product repo defines **what the product is**

## What this repo contains

```text
homero/
|- docs/                     # Harness architecture and decisions
|- packages/cli/             # homero command entrypoint
|- scripts/                  # Compatibility wrappers and self-test
`- templates/
	|- core/                  # Portable harness contract
	|- copilot/               # .github Copilot adapter
	`- claude/                # .claude Claude adapter
```

## Why this shape

A skill-only harness is too soft for a team working with repeated 4-file patterns
like forms and step flows. A CLI-only harness is too rigid and expensive to keep
aligned with the stack. Homero uses:

- markdown rules and skills for reasoning
- a small local generator for structure
- validation to keep the target repo coherent

The core stays portable. Copilot and Claude support are installed through
adapters so one client does not become a hidden dependency of the harness.

## Current scope

This first version bootstraps:

- `AGENTS.md`
- `CLAUDE.md`
- `homero.config.json`
- Homero docs inside `docs/homero/`
- a project constitution in `docs/homero/constitution.md`
- backend contract and mock guidance in `docs/homero/contracts.md`
- AI workflow and agent role docs in `docs/homero/ai-workflow.md` and `docs/homero/agent-roles.md`
- feature spec templates inside `specs/_template/`
- Copilot instructions under `.github/` when `--client copilot` is used
- Copilot custom agents under `.github/agents/` when `--client copilot` is used
- Claude rules and skills under `.claude/` when `--client claude` is used
- Claude custom agents under `.claude/agents/` when `--client claude` is used
- an example Figma MCP file
- a local `new-form` generator

## Usage

Bootstrap Homero into a target repo:

```powershell
node .\packages\cli\bin\homero.mjs init --target D:\path\to\repo --client copilot --project-name my-product
```

Run discovery to capture stack and business context:

```powershell
node .\packages\cli\bin\homero.mjs discover --target D:\path\to\repo --force
```

Use `--defaults` for non-interactive validation or demos:

```powershell
node .\packages\cli\bin\homero.mjs discover --target D:\path\to\repo --defaults --force
```

Validate a repo that already uses Homero:

```powershell
node .\packages\cli\bin\homero.mjs validate --target D:\path\to\repo --client copilot
```

Generate a form using the installed local generator:

```powershell
node .\packages\cli\bin\homero.mjs generate form --target D:\path\to\repo --name UserInfoForm --country cl
```

Run Homero's self-test:

```powershell
npm run validate:self
```

## Design rules for v0.1

1. The CLI is the primary install, validation, and scaffold layer.
2. Discovery creates the project-specific context before feature work starts.
3. The generator is only for repeated multi-file frontend patterns.
4. Tomaco rules live in the harness contract, not only in prompts.
5. Figma is a first-class input, but never the only source of truth.
6. Backend contracts or draft fixtures are first-class inputs for realistic mocks.
7. Workflow roles live in core docs; concrete custom agents live in client adapters.
8. Client adapters must remain replaceable.
9. Human review remains mandatory for UI fidelity, business intent, and contract assumptions.
