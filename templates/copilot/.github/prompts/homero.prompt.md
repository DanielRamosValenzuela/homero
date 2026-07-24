---
description: Give Homero a Figma URL and/or a short intent — it reads the design, implements with Tomaco, asks only if something is genuinely ambiguous, and reports the result.
agent: homero-coordinator
argument-hint: <Figma URL> [short intent]
---

Treat everything typed after `/homero` as the Figma URL and/or intent for
this task. If no Figma URL is present, ask for one before doing anything
else. Otherwise follow your normal homero-coordinator workflow end to end —
derive the feature, run `feature create` yourself, delegate to the other
agents, and drive the implementation loop — without pausing for
confirmation between steps unless a real blocking business, Figma, or
contract ambiguity comes up that you cannot resolve from the repo or the
Figma file.
