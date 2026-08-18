# Homero Copilot Instructions

<!-- homero:managed — maintained by `homero upgrade`. Delete this line to take ownership;
     upgrade will then leave it alone and write its version to
     copilot-instructions.md.homero-new for you to merge. -->

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` below means
`node scripts/homero/homero.mjs <command> --target . ...` — except
`init`/`upgrade`/`validate`, which need the Homero source templates and run via
`npx github:DanielRamosValenzuela/homero <command> ...`.

Talk to the human in Spanish — Falabella Seguros' teams work in Spanish day
to day. Code, identifiers, commit messages, and technical terms stay in
English as normal; chat responses (questions, reports, explanations) go in
Spanish. If the human writes in a different language, switch to that
language for the rest of the conversation.

Before making non-trivial frontend changes, read:

1. `AGENTS.md`
2. `docs/homero/business.md`
3. `docs/homero/architecture.md`
4. `docs/homero/conventions.md`
5. `docs/homero/verification.md`
6. `docs/homero/playwright-cli.md`
7. `docs/homero/knowledge-graph.md`

Frontend/UI/UX and Tomaco component rules apply automatically while editing
matching files, via `.github/instructions/*.instructions.md` — in particular
`seguros-falabella-ui-ux.instructions.md` (layout, hierarchy, pattern reuse)
and `tomaco-design-system.instructions.md` (exact component/prop/class/token,
plus `tomaco-component-gotchas.md` for verified per-component traps). These
are Copilot's equivalent of the `seguros-falabella-ui-ux` and
`tomaco-design-system` skills installed for Claude — same content, ported to
`applyTo`-triggered instructions since Copilot has no skills concept.

Use Homero as the harness contract:

- Start every non-trivial feature with `homero feature create`, run on a non-main branch already checked out (it refuses to run on main and does not create a branch itself); it produces the required contract. Do not create commits.
- Use Tomaco and existing project conventions over generated CSS or Tailwind-style output. Tomaco is mandatory.
- Require and record the approved Figma URL, node, and version before implementing visible UI.
- For backend-dependent features, request a contract source, draft contract, or explicit no-backend exception before inventing payloads.
- Register realistic anonymized mocks from the API or draft contract. Mocks are development-only and cannot be production fallbacks.
- Ask for missing business context when behavior is ambiguous.
- Prefer `scripts/homero/new-form.mjs` for repeated form scaffolds.
- Use Playwright CLI in the feature session to run user flows and save a screenshot plus snapshot for every scenario under `features/<id>/evidence/`.
- Use `graphify query` instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase.
- Run `node scripts/homero/homero.mjs feature check --target . --id <id>` before implementation and `node scripts/homero/homero.mjs verify --target . --id <id>` before claiming completion.
- Stop once the plan (`specs/<id>/plan.md`, `spec.md`) passes `feature check` and report it for human review before implementing — do not continue straight through, unless the human's own request already asked for uninterrupted end-to-end execution (constitution.md principle 9). `/homero-plan` stops there by design; `/homero-implement` picks up from an already-reviewed plan; `/homero` does both but still pauses there by default.
- Do not commit, push, create a pull request, merge, or modify Figma.
