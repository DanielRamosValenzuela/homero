---
description: Give Homero a Figma URL and/or a short intent — it reads the design, implements with Tomaco, asks only if something is genuinely ambiguous, and reports the result.
argument-hint: <Figma URL> [short intent]
---

Use the `homero-coordinator` subagent to handle this request: $ARGUMENTS

If `homero.config.json` still looks undiscovered, it should run discovery
conversationally first, per its normal instructions — that alone is a valid
use of this command, with no Figma URL required. Only when the request is
about implementing a specific screen and no Figma URL is present should it
ask for one before doing anything else. Otherwise it should follow its
normal workflow end to end without pausing for confirmation between steps,
except for a real blocking business, Figma, or contract ambiguity it cannot
resolve on its own.
