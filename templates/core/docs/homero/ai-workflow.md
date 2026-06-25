# AI workflow

Homero uses a spec-driven frontend workflow. For non-trivial features, the AI
agent should move through these phases in order:

```text
discover -> specify -> plan -> tasks -> implement -> verify -> converge
```

## Phase rules

### discover

Read the repo contract, ask missing stack and business questions, and record the
answers in `docs/homero/` and `homero.config.json`.

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
and plan are complete, proceed and run focused checks after edits.

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
