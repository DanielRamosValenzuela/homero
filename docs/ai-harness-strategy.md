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

The lifecycle this section originally proposed was:

```text
init -> discover -> constitution -> specify -> plan -> tasks -> implement -> verify -> converge
```

That's still the right shape of the *idea*, but `constitution`/`specify`/
`plan`/`tasks`/`implement`/`converge` were never built as six separate CLI
commands, and won't be — the design that actually shipped folds them into
fewer, more deterministic pieces instead. Real lifecycle, phase by phase:

- **init** → `homero init`, unchanged.
- **discover** → `homero discover`, unchanged as a command, but no longer
  console-only in practice: `homero-coordinator` is instructed to run it
  itself from chat the first time a repo looks undiscovered, asking the
  human the handful of real questions conversationally and passing them as
  per-field flags (`discover` already accepted `--<fieldName>` plus
  `--defaults` for the rest — the gap was the coordinator prompt never
  calling it that way, not a missing CLI feature).
- **constitution** → not a command. `discover` generates
  `docs/homero/constitution.md` directly as part of its interview output; there
  is nothing to run separately.
- **specify / plan / tasks** → not three commands. `homero feature create`
  copies `specs/_template/{spec,plan,tasks}.md` into `specs/<id>-<slug>/` in
  one step, writing into whatever non-main branch is already checked out (no
  worktree, and no branch creation either — see the 0.11.0/0.12.0 CHANGELOG
  entries for why that changed). Filling those three files in is a
  human/agent editing task (`homero-discovery` and `homero-planner` in
  `docs/homero/agent-roles.md`), not something the CLI generates content for.
- **implement** → `homero task add` to record tasks, then `homero run` /
  `homero task verify` / `homero task block` to drive the deterministic task
  loop in `features/<id>/state.json` (iteration/attempt limits, phase
  transitions — see `docs/homero/ai-workflow.md`).
- **verify** → `homero verify`, runs the configured lint/typecheck/test/e2e
  commands and writes an immutable receipt under `features/<id>/receipts/`.
  `homero feature check` is a separate, earlier gate (Figma/contract/countries
  recorded) run before implementation starts, not after.
- **converge** → not a command. There is no automated "compare code, spec,
  plan, and tasks" step — `homero-reviewer` does this as a delegated review,
  and the human accepts the feature by hand (`feature.json` `status:
  "accepted"`, which `run`/`task verify` are hard-coded to never silently
  revert).

Maintenance commands that don't belong to any single feature's lifecycle:
`homero upgrade` (refresh an existing install), `homero version` (drift
check), `homero generate form`/`generate catalog` (deterministic scaffolds),
`homero setup playwright`/`setup graphify` (one-time tooling installs).

See `docs/architecture.md`'s "Commands" section for the full, current command
list, or `homero <command> --help` for the authoritative flag reference.

Each phase's underlying goal (governing rules that reject bad plans, a spec
that captures what/why before how, a plan that names real files, small
verifiable tasks, executable verification, closing the loop instead of
silently declaring victory) is still exactly what the real commands above are
for — only the packaging changed, from six sequential commands to the
`discover` + `feature create` + task-loop + `verify` shape described above.

Two of the original phases are still real, standalone commands worth
detailing on their own:

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

## Command model

See `docs/architecture.md`'s "Commands" section for the full, current list —
duplicating it here would just create a second place for it to drift out of
sync with the CLI. The short version: `init`, `discover`, `feature create`/
`check`, `run`/`task add|verify|block|status`, `verify`, plus the maintenance
commands `upgrade`/`version`/`generate form|catalog`/`setup playwright|graphify`.

## Assessment of current Homero

What's actually built, as of this writing:

- A CLI-first foundation with a real deterministic state machine
  (`features/<id>/state.json`, iteration/attempt/verify-attempt limits,
  events.ndjson audit trail) — not just file scaffolding.
- A portable core template plus two adapters (Claude, Copilot) kept at
  content parity by hand: same 7 agent roles, same rules, same two
  design-system skills, translated per client's own format. `self-test.mjs`
  now runs a structural check (every topic exists on both sides) in CI, so a
  whole file silently missing on one adapter fails the build; wording-level
  parity is still hand-maintained.
- Local deterministic generation for forms (`generate form`) and for the
  Tomaco component catalog (`generate catalog`, reads the real installed
  package so the inventory can't silently drift from what's actually shipped).
- Validation of installed harness files per client, plus an `upgrade` command
  that refreshes Homero-managed files while leaving discover-authored docs and
  recorded config values alone (merge, not overwrite).

What's still genuinely rough:

- **Discovery is Q&A only.** It does not inspect the existing repo for real
  conventions before asking — a brownfield install gets the same generic
  questions as a greenfield one.
- **Verification gates are still mostly existence/boolean checks**, not deep
  content checks, though several of the weakest spots got real fixes:
  `contracts.mocks.registered` used to only need to be `true`, with no check
  that `mocks.source` pointed at a real file — `feature check` now fails if it
  doesn't. `requirements.uiStates` used to only need to be non-empty, which the
  shipped template's own generic default already satisfied — `feature check`
  now rejects that exact default array, forcing principle 14's "screen-specific
  states, not the starting checklist" into something enforced, not just
  written down. `plan.md` used to have no gate at all — any of its sections
  could stay the shipped template's placeholder forever and nothing noticed;
  `feature check`/`run`/`verify` now reject a plan whose required sections
  (repo patterns to reuse, Tomaco components/tokens, pixel-perfect styling,
  files to change, form/validation, Figma adaptation) still match the
  unedited template, per principles 15 and 18. A Figma URL with no node-id
  (url and version present, but pointing at the whole file, not an approved
  screen) also now fails principle 2's check — previously the field was
  written to `feature.json` but never read back anywhere. What's still
  unchecked: whether the content is actually *correct* — a plausible-sounding
  fabricated Tomaco component name or a made-up padding value passes exactly
  as well as a real one, whether the mock's actual *shape* matches the
  recorded contract, and whether a recorded "reuse search" actually found the
  right thing rather than just recording *something*. Country-logic isolation
  (principle 12's second half) and the human-review pause (principle 9) have
  no code-level check at all — see `docs/homero/verification.md`'s own
  breakdown of what is and isn't gated. `homero verify` running your real
  lint/typecheck/test/e2e commands remains the genuinely executable part.
- **No worked example ships with the repo.** There's no sample
  `specs/<id>-<slug>/` or `features/<id>/` with realistic content — a
  first-time reader has to infer the expected level of detail from
  `specs/_template/` alone.
- **The CLI is one 3000+ line file** (`packages/cli/bin/homero.mjs`) with no
  module decomposition — a real maintainability cost as more surface area
  gets added.
- **No evals for the 7 agents.** Both design-system skills on the Claude side
  now have `evals/evals.json` (5 prompts each: `seguros-falabella-ui-ux`,
  `tomaco-design-system`), but that convention doesn't exist on the Copilot
  side at all — every `.github/instructions/*.instructions.md` file has zero
  automated checks of the judgment it claims to enforce.
- **The claude/both client paths still have deeper coverage than copilot-only.**
  `scripts/self-test.mjs` exercises the full feature/task-loop/verify lifecycle
  (branch checkout, task states, receipts) only against a `--client both` install; the
  isolated `--client copilot` coverage is narrower (init/validate/`generate
  catalog`/`upgrade`, not the full feature loop). It's the source of truth for
  exactly what's covered right now — check it before assuming a given
  command/flag combination is exercised.