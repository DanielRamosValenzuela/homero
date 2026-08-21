---
description: Give Homero a Figma URL and/or a short intent — it plans the feature, pauses for you to review the plan, then implements with Tomaco once you say go.
agent: homero-coordinator
argument-hint: <Figma URL> [short intent]
---

Treat everything typed after `/homero` as the Figma URL and/or intent for
this task. If `homero.config.json`'s `discovery.discoveredAt` field is still
unset, run discovery conversationally first, per your normal
homero-coordinator instructions — that alone is a valid use of this prompt,
with no Figma URL required. Do not judge "already discovered" by whether
`commands`/`packageManager`/`contracts` look filled in — `homero init` seeds
those with concrete template defaults before any human answers a question. Only
when the intent is to implement a specific screen and no Figma URL is
present should you ask for one before doing anything else. Otherwise follow
your normal homero-coordinator workflow through the plan checkpoint
(constitution.md principle 9) — derive the feature, run `feature create`
yourself, delegate to the other agents, and stop once the plan passes
`feature check` to report it for review, instead of going on to implement —
except for a real blocking business, Figma, or contract ambiguity you
cannot resolve from the repo or the Figma file, or when the text after
`/homero` already asks for uninterrupted end-to-end execution (e.g.
"impleméntalo sin pausar", "hazlo todo de una"), in which case keep going
straight through implementation and verification instead of stopping at
the plan.
