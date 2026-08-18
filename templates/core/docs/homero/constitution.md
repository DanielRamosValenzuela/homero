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
5. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-backend exception.
6. Mocks must be realistic, anonymized, traceable to a contract source or recorded assumption, and development-only.
7. Feature work must start with `homero feature create`, run on a non-main branch the human already checked out (it does not create one), producing a contract, spec, plan, task list, Playwright CLI evidence, and verification receipt.
8. The AI agent must ask about blocking ambiguity before implementing.
9. The AI agent must pause once the plan (`specs/<id>/spec.md`, `specs/<id>/plan.md`) passes `homero feature check`, and report it to the human for review, before starting implementation — a passing gate proves the plan is complete, not that a human approved it. The only exception is when the human's own request explicitly asked for uninterrupted end-to-end execution (e.g. "implementa todo sin pausar"); short of that, implementing straight through the plan checkpoint is not "efficiency," it is the exact gap this principle exists to close. Once implementation has actually started, it proceeds without further pauses except for a real blocking ambiguity or a verification failure that needs a human decision.
10. Verification commands in `homero.config.json` are part of the definition of done.
11. Only humans may commit, push, open pull requests, merge, or modify Figma.
12. Features must record which countries they target in `feature.json`. Keep country-specific business rules, copy, and validation messages isolated from shared logic so adding a country does not require rewriting shared code.
13. The AI agent must use `graphify query` (see `docs/homero/knowledge-graph.md`) instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase. Reading files one by one for exploration that a graph query could answer wastes tokens and is a constitution violation, not a style preference.
14. UI states and field-level behavior recorded in a spec must be specific to the screen being built. The default `requirements.uiStates` list in `feature.json` is a starting checklist, not proof of analysis. Every form input needs its exact validation error copy, and **every interactive element** — buttons and CTAs included, not only the ones that look unusual — **must have its triggered behavior confirmed or recorded as an open question.** Visual clarity is not the same as behavior being specified: a plain "Guardar"/"Continuar" button is visually obvious but its destination, side effect, or validation gate is not, unless the human or the spec actually said so. Toggles and switches that gate a business rule (e.g. an "advisor mode" switch on a form) need the exact rule they turn on or off, not an assumed default — check `seguros-falabella-ui-ux`'s "Known Cross-Product Patterns" first, since some of these are recurring, already-confirmed Falabella Seguros patterns, and present a match as a confirmation to the human rather than a blank question. Do not fill an unconfirmed element with a plausible-sounding guess, and do not silently apply a known pattern without at least confirming it applies here — ask either way, just ask a sharper question when a pattern already narrows it down. Getting a field's exact error copy means actually checking Figma for an error/invalid-state variant of that field (a separate component state, frame, or annotation — most designs model it this way, not inline in the default frame) before writing anything down. A blank check is not the same as an intentional "this design has no error copy specified" — if no error variant exists anywhere in the file, that is itself an open question, not license to invent generic copy.
15. Before adding a new shared widget or component, search the repo (and `graphify query` for relationship questions) for one that already covers the need. Reuse or extend it — a new file duplicating existing shared UI is a rejection, not a style note. `plan.md`'s "Repo patterns to reuse" section must record what was actually found, including page chrome (header/nav/footer) already provided elsewhere in the app (principle 19) — `homero feature check`/`run`/`verify` reject a plan that leaves it as the unedited template placeholder, same as the sections in principle 18. This proves the search happened, not that its conclusion was correct — that judgment is still `homero-reviewer`'s job.
16. Before building a new component, confirm Tomaco does not already ship one for the need — check the Figma Code Connect mapping (if configured) and the installed `tomaco-components` package, not just memory. A hand-built lookalike of an existing Tomaco component is a rejection, not a style note.
17. A referenced secondary surface (modal, drawer, tooltip content, sub-screen) without its own approved Figma coverage must not be invented. Ask whether to source a design for it or leave it out of the feature — both are valid answers; do not word the question as if a design is the only acceptable one.
18. A feature plan (`specs/<id>/plan.md`) must name every Tomaco component and design token it uses per screen, and specify exact pixel-perfect styling (paddings, margins, layout, breakpoints) — not a general description of the design. `homero feature check`, `homero run`, and `homero verify` enforce this on plan.md's required sections; leaving them as the shipped template's empty placeholders blocks the feature, it is not proof the plan was written.
19. A screen or step component must not rebuild page chrome (header, top navigation, logo bar, footer) that already exists elsewhere in the app. Checking only the framework's root layout file (e.g. Next.js `app/layout.tsx`) is not enough — in real Falabella Seguros repos, chrome commonly lives in a shared molecule/component (e.g. `Header`, `Layout`) that every screen imports and composes explicitly, not in the root layout itself, which may render only providers. Before planning or implementing a screen with header-like content, check how existing sibling screens/steps actually compose their own chrome (grep other `page.tsx`/route files for what they import) — that is the source of truth for whether chrome already exists, not an assumption about where framework convention says it "should" live. Building it again inside the screen produces a visible duplicate, not a stylistic choice.
20. `homero-coordinator` is the only agent the human ever talks to directly. No client adapter may expose a way to converse with a sub-agent instead (e.g. a UI handoff) — sub-agents are frequently pinned to a different, cheaper model on purpose (`homero.config.json` `agents.models`), so a direct human-to-subagent conversation silently changes which model actually answers, with no indication anything changed.

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
- introduces a new shared widget or component that duplicates one already available under `paths.widgetsRoot`
- builds a component that duplicates one `tomaco-components` already ships instead of reusing or composing it
- implements a referenced surface (modal, drawer, tooltip content, sub-screen) that has no approved Figma source instead of asking whether to source one or skip it
- leaves plan.md's Tomaco components/tokens, pixel-perfect styling, or repo-patterns-to-reuse sections empty instead of naming exact components, tokens, paddings, layout, and what was actually found to reuse
- starts implementation the moment the plan passes `feature check`, without giving the human a chance to review it, when the human never asked for uninterrupted end-to-end execution
- rebuilds page chrome (header, top navigation, logo bar, footer) that already exists elsewhere in the app — a shared molecule sibling screens already import, not just the framework's root layout file — instead of checking sibling screens and reusing it
- writes a field's validation error copy without checking Figma for an error/invalid-state variant first, or invents generic copy when no such variant exists instead of recording it as an open question
