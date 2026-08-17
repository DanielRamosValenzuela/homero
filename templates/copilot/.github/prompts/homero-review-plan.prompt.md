---
description: Optional — audits an already-written plan (spec.md/plan.md) for internal consistency before you approve it. Fresh session, reads only the final artifacts from disk, no leftover planning conversation.
agent: homero-coordinator
argument-hint: <feature id, e.g. FEAT-042>
---

Resolve the feature id from what's typed after `/homero-review-plan` (or from
context if there's exactly one feature in flight). Confirm `homero feature
check --target . --id <id>` passes first — if it doesn't, say so and stop;
there's nothing coherent to review yet, run `/homero-plan` (or keep working
it) instead.

Delegate straight to `homero-reviewer` in its plan mode. Do not re-read or
re-summarize the planning conversation yourself first — the point of running
this as its own prompt is a clean read of `specs/<id>/spec.md`,
`specs/<id>/plan.md`, and `features/<id>/feature.json` as they stand on
disk, not a continuation of however long the planning conversation ran.

Report the reviewer's findings as-is. This prompt never edits `plan.md`,
never re-plans, and never implements — if there are blocking findings, tell
the human what they are and let them decide whether to ask for a revision
(a normal follow-up message to `homero-planner`/`homero-figma` handles that)
or proceed anyway.
