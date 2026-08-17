---
description: Set up Homero for this repo — asks the real stack/business questions in chat, then runs `homero discover` for you. Run this once per repo, before your first `/homero`.
agent: homero-coordinator
argument-hint: [anything you already know — stack, countries, etc.]
---

Run discovery for this repo, per your normal homero-coordinator
instructions. Ask the human the handful of real discovery questions
conversationally — framework, form stack, design system package, countries,
contract mode and source, test commands, and the rest of `discoveryFields`
(see `docs/homero/ai-workflow.md`'s discover section for the full list and
the exact command shape). For package manager specifically: check the repo
for `pnpm-lock.yaml`/`yarn.lock`/`package-lock.json` yourself first — a
lockfile is ground truth — and only ask the human if none exists yet (a new
repo). Do not assume pnpm just because it's the CLI's fallback default. For
Figma specifically: `figmaSource` is a project-wide workspace/team
convention at most (e.g. a Figma team URL) — TBD is a perfectly fine
answer. Do not ask for a specific screen's Figma link here, and do not
open, fetch, or attempt to analyze any Figma content during discovery —
that only happens per feature in `/homero-plan`, where reading it (via MCP,
or via screenshots the human pastes in when they don't have MCP access)
actually makes sense. Do not read the list at the human mechanically; ask
like a teammate onboarding onto the repo, and skip anything already given
after `/homero-discover`. Then run `discover` yourself with what you
learned, adding `--defaults` to fill in anything not worth asking about for
this repo.

Do not create a feature, and do not start implementing anything — this
prompt is discovery only. If `homero.config.json` already looks discovered,
say so and ask whether to re-run it with `--force` before doing anything
else.
