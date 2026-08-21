---
description: Set up Homero for this repo — asks the real stack/business questions in chat, then runs `homero discover` for you. Run this once per repo, before your first `/homero`.
argument-hint: [anything you already know — stack, countries, etc.]
---

Use the `homero-coordinator` subagent to run discovery for this repo: $ARGUMENTS

Ask the human the handful of real discovery questions conversationally —
framework, form stack, design system package, countries, contract mode and
source, test commands, and the rest of `discoveryFields` (see
`docs/homero/ai-workflow.md`'s discover section for the full list and the
exact command shape). For package manager specifically: check the repo for
`pnpm-lock.yaml`/`yarn.lock`/`package-lock.json` yourself first — a lockfile
is ground truth — and only ask the human if none exists yet (a new repo).
Do not assume pnpm just because it's the CLI's fallback default. **Do not
ask about `figmaSource` at all.** Default it to `TBD` automatically, the
same way `--defaults` would — it is at most a project-wide workspace/team
convention, never a specific screen's link, and spending a question on it
here is redundant: `/homero-plan` is where a real per-feature Figma URL
actually gets collected and used. If the human happens to mention a Figma
workspace/team URL unprompted in their own words, record that instead of
TBD — but never ask for it, and never open, fetch, or attempt to analyze
any Figma content during discovery. Do not read the list at the human
mechanically; ask like a teammate onboarding onto the repo, and skip
anything they already told you in $ARGUMENTS. Then run
`node scripts/homero/homero.mjs discover --target . --<field> "<value>" ...`
yourself with what you learned, adding `--defaults` to fill in anything not
worth asking about for this repo.

Do not create a feature, and do not start implementing anything — this
command is discovery only. Check `homero.config.json`'s `discovery.discoveredAt`
field specifically — if it's already set, say so and ask whether the human
wants to re-run with `--force` before doing anything else. Do not judge
"already discovered" by whether `commands`/`packageManager`/`contracts` look
filled in: `homero init` seeds those with concrete template defaults (e.g.
`packageManager: "pnpm"`) before any human answers a single question, so a
brand-new, never-discovered repo can look fully populated at a glance —
`discoveredAt` is the only field `discover()` itself writes, and the only
reliable signal a real run happened.

**Closing report.** Once `discover` finishes, report what was recorded and
stop there — say what comes next in one plain sentence: run `/homero-plan
<Figma URL> <intent>` (or `/homero` for the combined flow) once there's a
real feature to build. Do not guess or propose a specific feature name, id,
or business area — that is not discovery's call to make, even if the
human's answers mentioned a product area in passing. Do not offer a
menu of options for how to proceed, and never suggest starting a plan
without Figma or with an assumed/mock design "in the meantime" — Figma is
mandatory for visual work (constitution.md principle 2), and there is no
shortcut version of that rule, not even to save a round-trip.
