---
description: Optional — audits an already-written plan (spec.md/plan.md) for internal consistency before you approve it. Fresh session, reads only the final artifacts from disk, no leftover planning conversation.
agent: homero-reviewer
argument-hint: <feature id, e.g. FEAT-042>
---

Run your **plan mode** on feature `$ARGUMENTS`. Resolve the feature id from
what's typed after `/homero-review-plan` (or from context if there's exactly
one feature in flight). Confirm `homero feature check --target . --id <id>`
passes first — if it doesn't, say so and stop; there's nothing coherent to
review yet, tell the human to run `/homero-plan` (or keep working it)
instead.

Do not re-read or re-summarize any prior planning conversation — you have
none in this session, and that is the point of running this as its own
prompt: a clean read of `specs/<id>/spec.md`, `specs/<id>/plan.md`, and
`features/<id>/feature.json` exactly as they stand on disk right now, not a
continuation of however long the planning conversation ran.

Report your findings as-is. This prompt never edits `plan.md`, never
re-plans, and never implements — if there are blocking findings, state them
plainly and let the human decide whether to ask for a revision (a normal
follow-up message to `homero-planner`/`homero-figma`, via `homero-coordinator`,
handles that) or proceed anyway.
