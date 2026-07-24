# AI workflow

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` on this page means
`node scripts/homero/homero.mjs <command> --target . ...`.

Homero uses a spec-driven frontend workflow. For non-trivial features, the AI
agent should move through these phases in order:

```text
discover -> specify -> plan -> tasks -> implement -> verify -> converge
```

## Phase rules

### discover

Read the repo contract, ask missing stack and business questions, and record the
answers in `docs/homero/` and `homero.config.json`. When exploring unfamiliar or
large parts of the codebase, use `graphify` instead of a broad file-by-file read
— see `docs/homero/knowledge-graph.md`.

### specify

Create `specs/<feature>/spec.md` from product intent, Figma input, backend
contracts, and acceptance criteria. Focus on what and why before implementation.

### plan

Create `specs/<feature>/plan.md` by adapting the spec to the real repo patterns.
Name files, dependencies, risks, mock strategy, and verification steps.

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
