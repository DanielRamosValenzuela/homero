# Homero AI harness strategy

## Product boundary

Homero should be one of three independent projects:

1. **Frontend starter project**: the product code template and default stack.
2. **Skills package**: reusable AI workflows and optional domain procedures.
3. **Harness**: the CLI, context model, discovery flow, custom agents, generated docs, and verification gates that make AI work predictable in frontend repos.

Homero is the harness. It should not own the starter application's source code,
and it should not require a specific skill engine to be useful.

## Research takeaways

Public guidance from GitHub Copilot, Claude Code, and GitHub Spec Kit points to
the same operating model:

- Keep persistent instructions concise, specific, and repository-scoped.
- Split always-on context from task-specific procedures.
- Define workflow roles in core docs and install concrete custom agents through client adapters.
- Use deterministic CLI commands for install, validation, and repeatable file generation.
- Let the agent interview the user before large features.
- Write a durable spec before implementation when the scope is uncertain.
- Make verification executable: lint, typecheck, tests, screenshots, or design checks.
- Treat backend contracts and mock data as first-class inputs for frontend independence.
- Treat instructions as guidance, not enforcement; use scripts or hooks for hard gates.
- Keep generated harness artifacts idempotent and inspectable.

## Target lifecycle

Homero should support this frontend AI lifecycle:

```text
init -> discover -> constitution -> specify -> plan -> tasks -> implement -> verify -> converge
```

### init

Install Homero into a new or existing frontend repo.

Expected output:

- `AGENTS.md`
- client adapter instructions
- `homero.config.json`
- `docs/homero/*`
- local generators

### discover

Inspect the repo and interview the user. This is where Homero should ask about:

- project status: new starter or existing brownfield repo
- framework and runtime
- form stack: React Hook Form, Zod, or another choice
- design system: Tomaco by default, Tailwind only by explicit exception
- state and data tools
- testing commands
- countries, channels, or business variants
- Figma source of truth
- backend contract mode, source, format, mock strategy, and sensitive data policy
- product goals, stakeholders, success criteria, and out-of-scope items

Expected output:

- completed `docs/homero/business.md`
- completed `docs/homero/architecture.md`
- completed `docs/homero/conventions.md`
- completed `docs/homero/contracts.md`
- completed `homero.config.json`

### constitution

Create or update project principles that future features must obey.

Expected output:

- `docs/homero/constitution.md`

This should be short and governing, not a tutorial. It should state the rules
that would cause a feature plan or implementation to be rejected.

### specify

Create a feature spec from user intent and Figma inputs. The spec should focus
on what and why before implementation details.

Expected output:

- `specs/<feature>/spec.md`

The spec should include user stories, business rules, design references, edge
cases, contract and mock requirements, acceptance criteria, and open questions.

### plan

Turn the spec into a technical plan adapted to the actual repo.

Expected output:

- `specs/<feature>/plan.md`

The plan should name files to create or modify, reuse patterns found in the
repo, identify risks, and define verification steps.

### tasks

Break the plan into ordered implementation tasks.

Expected output:

- `specs/<feature>/tasks.md`

Tasks should be small enough for an AI agent to execute and validate without
re-reading the whole project.

### implement

Execute the task list. The AI should ask questions only when the spec or plan
has blocking ambiguity. Otherwise, it should implement, run focused checks, and
iterate.

### verify

Run deterministic checks and produce evidence.

Expected checks:

- configured lint command
- configured typecheck command
- configured test command
- generated artifact checks
- Figma/design comparison checklist
- no unresolved open questions in the feature spec

### converge

Compare code, spec, plan, and tasks after implementation. If gaps remain, add
explicit follow-up tasks instead of silently considering the feature done.

## Recommended Homero command model

```powershell
homero init --target <repo> --client copilot|claude|both
homero discover --target <repo>
homero constitution --target <repo>
homero specify --target <repo> --feature <name> --figma <url>
homero plan --target <repo> --feature <name>
homero tasks --target <repo> --feature <name>
homero implement --target <repo> --feature <name>
homero verify --target <repo> --feature <name>
homero converge --target <repo> --feature <name>
```

## Assessment of current Homero

Homero is moving in the right direction because it already has:

- a CLI-first foundation
- a portable core template
- separate Copilot and Claude adapters
- local deterministic generation
- validation of installed harness files

The main missing pieces are:

- richer repo inspection during discovery
- feature-specific spec, plan, and tasks commands
- command templates for spec-driven work
- richer handoffs between custom agents and CLI commands
- stronger verification gates beyond file existence, including contract/mock checks
- migrations or upgrade strategy for repos that already have Homero installed

## Next implementation priorities

1. Add `homero specify` to create `specs/<feature>/spec.md` from the template.
2. Add `homero plan` and `homero tasks` to create feature-specific planning artifacts.
3. Add `homero verify` to run configured project commands and check feature
   artifacts.
4. Add adapter prompt files or skills that expose the lifecycle commands to
   Copilot and Claude.
5. Add idempotent upgrade behavior before distributing Homero broadly.