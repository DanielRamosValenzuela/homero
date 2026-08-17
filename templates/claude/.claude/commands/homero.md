---
description: Give Homero a Figma URL and/or a short intent — it plans the feature, pauses for you to review the plan, then implements with Tomaco once you say go.
argument-hint: <Figma URL> [short intent]
---

Use the `homero-coordinator` subagent to handle this request: $ARGUMENTS

If `homero.config.json` still looks undiscovered, it should run discovery
conversationally first, per its normal instructions — that alone is a valid
use of this command, with no Figma URL required. Only when the request is
about implementing a specific screen and no Figma URL is present should it
ask for one before doing anything else. Otherwise it should follow its
normal workflow through the plan checkpoint (constitution.md principle 9) —
stop and report the plan once it passes `feature check`, do not go on to
implement — except for a real blocking business, Figma, or contract
ambiguity it cannot resolve on its own, or when `$ARGUMENTS` itself already
asks for uninterrupted end-to-end execution (e.g. "impleméntalo sin
pausar", "hazlo todo de una"), in which case it should keep going straight
through implementation and verification instead of stopping at the plan.
