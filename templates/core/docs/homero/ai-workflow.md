# AI workflow

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` on this page means
`node scripts/homero/homero.mjs <command> --target . ...`.

Homero uses a spec-driven frontend workflow. For non-trivial features, the AI
agent should move through these phases in order:

```text
discover -> specify -> plan -> tasks -> implement -> verify -> converge
```

These are conceptual phases, and the agent moves through most of them in one
continuous session without announcing each one — with exactly one deliberate
checkpoint: **after `plan`**. Once `specs/<id>/plan.md` passes `homero
feature check`, the agent stops and reports the plan for the human to
review before moving on to `tasks`/`implement` (constitution.md principle
9). A passing gate proves the plan is complete, not that a human signed off
on it — those are different things, and the whole point of a human-readable
plan is that a human actually reads it before code gets written from it.

This checkpoint maps directly to the command surface:

- `/homero-plan` runs discover (if needed) through plan, then stops there by
  design — it never creates tasks or calls `homero-implementer`.
- `/homero-review-plan` is optional: a fresh session that reads
  `specs/<id>/spec.md`/`plan.md`/`feature.json` off disk and audits them for
  internal consistency with `homero-reviewer` (plan mode) — not a CLI gate,
  just a second opinion the human can ask for before approving, cheap
  precisely because it starts clean instead of inheriting however long the
  planning conversation ran.
- `/homero-implement` picks up an already-planned feature (its plan must
  already pass `feature check`) and drives tasks through verify.
- `/homero` does both in one command, but still pauses at the plan
  checkpoint by default — same as running the two above back to back.

The only way past the checkpoint without a second command or a follow-up
message is when the human's own request already asked for uninterrupted
end-to-end execution (e.g. "implementa todo sin pausar", "no te detengas a
revisar"). Outside of that one checkpoint, the human sees at most a handful
of discovery questions (first time in a repo) and a final report; nothing
else pauses for confirmation, unless a real blocking ambiguity comes up.

## Phase rules

### discover

Read the repo contract, ask missing stack and business questions, and record the
answers in `docs/homero/` and `homero.config.json`. When exploring unfamiliar or
large parts of the codebase, use `graphify` instead of a broad file-by-file read
— see `docs/homero/knowledge-graph.md`.

Run this yourself, in chat — never tell the human to open a terminal.
`homero discover` accepts every question as a flag (e.g. `--framework`,
`--formStack`, `--countries`, `--contractMode`; run `homero discover --help`
for the full list) and falls back to sane defaults for anything you omit if
you pass `--defaults`. Ask the human only the handful of questions that
actually vary per repo — framework, form stack, design system package,
countries, contract mode/source, test commands — as normal chat messages,
then run discovery yourself with what you learned:

```
node scripts/homero/homero.mjs discover --target . --framework "Next.js 14" --formStack "React Hook Form + Zod" --countries "cl,pe" --defaults
```

Skip this phase entirely once `homero.config.json` already looks discovered
(its `discovery`/`stack`/`contracts` fields are filled in, not `TBD`).

### specify

Create `specs/<feature>/spec.md` from product intent, Figma input, backend
contracts, and acceptance criteria. Focus on what and why before implementation.

### plan

Create `specs/<feature>/plan.md` by adapting the spec to the real repo patterns.
Name files, dependencies, risks, mock strategy, and verification steps. Name
every Tomaco component and token used per screen, and the exact pixel-perfect
styling (paddings, margins, layout, breakpoints) per screen and viewport —
`feature check`/`run`/`verify` reject a plan that leaves either section as the
unedited template (principle 18, `constitution.md`).

### tasks

Create `specs/<feature>/tasks.md` with small, ordered tasks. Each task should be
implementable and verifiable without rediscovering the whole repo.

### implement

Implement the task list. Ask questions only for blocking ambiguity. If the spec
and plan are complete, proceed and run focused checks after edits. Before
touching unfamiliar or large parts of the codebase, query the knowledge graph
(`docs/homero/knowledge-graph.md`) instead of reading many files manually —
this is a constitution requirement, not a suggestion.

### verify

Run the configured checks and compare the result against the spec, plan, Figma
input, backend contracts, and `docs/homero/verification.md`.

### converge

Compare implementation, spec, plan, tasks, contracts, and verification evidence.
Record remaining gaps as explicit follow-up tasks.

## Subagent rule

When the active AI client supports custom agents or subagents, use specialized
agents for research, planning, contracts, implementation, and review. If the
client does not support subagents, follow the same role boundaries in one
session.

## Loop state and resume

Each feature tracks its own progress in `features/<id>/state.json` and
`features/<id>/events.ndjson`, independent of which AI client is working it.
These files are the source of truth for resuming after an interruption
(a new session, a client switch, running out of context).

- Before doing anything on an existing feature, run
  `node scripts/homero/homero.mjs task status --target . --id <id>` to see
  the current phase, iteration count, active task, and recent events.
- Call `node scripts/homero/homero.mjs run --target . --id <id>` to get the
  next task to implement. It enforces `runtime.maxIterations` and reports
  the exact next commands.
- Close a task with `node scripts/homero/homero.mjs task verify --target .
  --id <id> --task <task-id> --summary "<what changed>"`, or record a failed
  attempt with `node scripts/homero/homero.mjs task block --target . --id
  <id> --task <task-id> --reason "<why>"` (bounded by
  `runtime.maxAttemptsPerTask`).
- These commands never call an LLM; they are deterministic state updates the
  agent calls between its own reasoning steps.
- `node scripts/homero/homero.mjs verify --target . --id <id>` is bounded the
  same way (`runtime.maxVerifyAttempts`, 2 by default): after that many
  failures in a row it stops running and `state.phase` becomes
  `verify-exhausted` — a human must review the receipt and either fix the
  specific failure or say what to do next before it runs again.
