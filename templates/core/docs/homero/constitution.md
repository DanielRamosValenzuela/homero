# Homero constitution

This document defines the governing principles for AI-assisted frontend work in
this repository. Update it during discovery and review it before planning large
features.

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` mentioned below means
`node scripts/homero/homero.mjs <command> --target . ...`.

## Principles

1. Business intent comes before implementation details.
2. Every visual feature requires an approved Figma URL, node, and version. Unclear business behavior must be clarified.
3. Tomaco is mandatory for all UI implementation.
4. Forms must use the project-approved validation and state-management stack.
5. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-contract exception.
6. Mocks must be realistic, anonymized, traceable to a contract source or recorded assumption, and development-only.
7. Feature work must start with `homero feature create`, creating a local branch, contract, spec, plan, task list, Playwright CLI evidence, and verification receipt.
8. The AI agent must ask about blocking ambiguity before implementing.
9. The AI agent should implement without extra confirmation when the feature gate passes.
10. Verification commands in `homero.config.json` are part of the definition of done.
11. Only humans may commit, push, open pull requests, merge, or modify Figma.
12. Features must record which countries they target in `feature.json`. Keep country-specific business rules, copy, and validation messages isolated from shared logic so adding a country does not require rewriting shared code.
13. The AI agent must use `graphify query` (see `docs/homero/knowledge-graph.md`) instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase. Reading files one by one for exploration that a graph query could answer wastes tokens and is a constitution violation, not a style preference.
14. UI states and field-level behavior recorded in a spec must be specific to the screen being built. The default `requirements.uiStates` list in `feature.json` is a starting checklist, not proof of analysis. Every form input needs its exact validation error copy, and every interactive element whose behavior is not visually obvious (tooltips, secondary buttons, "more info" links or icons, accordions) must have its behavior confirmed or recorded as an open question.
15. Before adding a new shared widget or component, search the repo (and `graphify query` for relationship questions) for one that already covers the need. Reuse or extend it — a new file duplicating existing shared UI is a rejection, not a style note.

## Rejection criteria

A feature plan or implementation should be rejected if it:

- omits an approved Figma reference or implements UI outside Tomaco
- invents business rules that were not specified or confirmed
- invents backend payloads without recording a contract mode or draft assumption
- copies raw Figma or Tailwind output without adapting it to the project
- skips required validation for forms or server boundaries
- lacks executable verification or a passing Homero receipt
- hardcodes country-specific business rules, copy, or validation messages inside shared logic instead of isolating them per country
- explores unfamiliar code file-by-file when `graphify query` was available and unused
- leaves UI states or validation error copy as the generic default instead of screen-specific content, or leaves an interactive element's behavior unconfirmed
- introduces a new shared widget or component that duplicates one already available under `paths.widgetsRoot` or an existing design-system pattern
