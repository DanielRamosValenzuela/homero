---
description: Give Homero a Figma URL and/or a short intent — it reads the design, writes spec.md/plan.md, and stops there for you to review before any code gets written.
argument-hint: <Figma URL> [short intent]
---

Use the `homero-coordinator` subagent to plan this feature: $ARGUMENTS

If `homero.config.json`'s `discovery.discoveredAt` field is still unset, run
discovery conversationally first, per its normal instructions — do not judge
"already discovered" by whether `commands`/`packageManager`/`contracts` look
filled in, since `homero init` seeds those with concrete template defaults
before any human answers a question. Otherwise: derive or
locate the feature, delegate to `homero-figma`/`homero-contracts`/
`homero-planner`, and write `specs/<id>/spec.md` and `specs/<id>/plan.md`
with everything `homero feature check` requires — including every Tomaco
component/token and the exact pixel-perfect styling per screen (principle
18, `constitution.md`), not a general description.

Run `homero feature check` yourself to confirm the plan actually passes.

**Stop here.** Do not run `homero task add`, do not call `homero-implementer`,
do not run the task loop or `homero verify` — this command is planning only,
the same way `/homero-discover` is discovery only. Report the feature id,
where the plan lives, and a short summary — **and every open question or
critique `homero-figma`/`homero-planner` returned, even the ones you think
have an obvious answer** (an unstated button destination, an unexplained
toggle, an alternative worth considering). A gate passing means the plan is
structurally complete, not that nothing is unclear — do not quietly resolve
these yourself. Tell the human to review it — optionally with
`/homero-review-plan <id>` for a fresh-session audit for internal consistency
first — and run `/homero-implement <id>` (or `/homero` again) when they're
ready, even if the plan looks obviously complete and correct to you.
