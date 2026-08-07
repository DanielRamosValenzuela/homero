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
the exact command shape). Do not read the list at the human mechanically;
ask like a teammate onboarding onto the repo, and skip anything already
given after `/homero-discover`. Then run `discover` yourself with what you
learned, adding `--defaults` to fill in anything not worth asking about for
this repo.

Do not create a feature, and do not start implementing anything — this
prompt is discovery only. If `homero.config.json` already looks discovered,
say so and ask whether to re-run it with `--force` before doing anything
else.
