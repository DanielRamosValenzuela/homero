---
description: Give Homero a Figma URL and/or a short intent — it reads the design, implements with Tomaco, asks only if something is genuinely ambiguous, and reports the result.
argument-hint: <Figma URL> [short intent]
---

Use the `homero-coordinator` subagent to handle this request: $ARGUMENTS

If no Figma URL is present in the request, it should ask for one before
doing anything else. Otherwise it should follow its normal workflow end to
end without pausing for confirmation between steps, except for a real
blocking business, Figma, or contract ambiguity it cannot resolve on its
own.
