---
description: Give Homero a Figma URL and/or a short intent — it reads the design, writes spec.md/plan.md, and stops there for you to review before any code gets written.
argument-hint: <Figma URL> [short intent]
---

Use the `homero-coordinator` subagent to plan this feature: $ARGUMENTS

If `homero.config.json` still looks undiscovered, run discovery
conversationally first, per its normal instructions. Otherwise: derive or
locate the feature, delegate to `homero-figma`/`homero-contracts`/
`homero-planner`, and write `specs/<id>/spec.md` and `specs/<id>/plan.md`
with everything `homero feature check` requires — including every Tomaco
component/token and the exact pixel-perfect styling per screen (principle
18, `constitution.md`), not a general description.

Run `homero feature check` yourself to confirm the plan actually passes.

**Stop here.** Do not run `homero task add`, do not call `homero-implementer`,
do not run the task loop or `homero verify` — this command is planning only,
the same way `/homero-discover` is discovery only. Report the feature id,
where the plan lives, and a short summary, and tell the human to review it
and run `/homero-implement <id>` (or `/homero` again) when they're ready —
even if the plan looks obviously complete and correct to you.
