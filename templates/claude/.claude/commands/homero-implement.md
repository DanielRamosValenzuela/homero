---
description: Implement an already-planned Homero feature — drives the task loop and verification to completion. Run /homero-plan first if the feature hasn't been planned yet.
argument-hint: <feature id, e.g. FEAT-042> [anything else worth knowing]
---

Use the `homero-coordinator` subagent to implement this feature: $ARGUMENTS

Resolve the feature id from `$ARGUMENTS` (or from context if there's exactly
one feature in flight). Recover progress with `homero task status` first —
never assume a fresh start. Run `homero feature check`: if it fails because
the plan is incomplete, say so and suggest `/homero-plan` instead of
planning it yourself here — this command assumes the plan checkpoint
(constitution.md principle 9) already happened and a human already reviewed
`specs/<id>/plan.md`.

If the gate passes, drive tasks yourself end to end: `task add` (if tasks
don't exist yet — from `homero-planner`'s ordered list), `run`, `task
verify`/`task block`, and `homero verify`, without pausing between steps,
unless a task comes back blocked, a verification fails and needs a human
decision, or a real blocking ambiguity comes up. Report the final phase,
verification evidence, and next action.
