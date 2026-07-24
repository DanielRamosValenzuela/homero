# Homero Copilot Instructions

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` below means
`node scripts/homero/homero.mjs <command> --target . ...` — except
`init`/`validate`, which need the Homero source template and run via
`npx github:DanielRamosValenzuela/homero <command> ...`.

Before making non-trivial frontend changes, read:

1. `AGENTS.md`
2. `docs/homero/business.md`
3. `docs/homero/architecture.md`
4. `docs/homero/conventions.md`
5. `docs/homero/verification.md`
6. `docs/homero/playwright-cli.md`
7. `docs/homero/knowledge-graph.md`

Use Homero as the harness contract:

- Start every non-trivial feature with `homero feature create`; it creates the required local feature branch and contract. Do not create commits.
- Use Tomaco and existing project conventions over generated CSS or Tailwind-style output. Tomaco is mandatory.
- Require and record the approved Figma URL, node, and version before implementing visible UI.
- For backend-dependent features, request a contract source, draft contract, or explicit no-contract exception before inventing payloads.
- Register realistic anonymized mocks from the API or draft contract. Mocks are development-only and cannot be production fallbacks.
- Ask for missing business context when behavior is ambiguous.
- Prefer `scripts/homero/new-form.mjs` for repeated form scaffolds.
- Use Playwright CLI in the feature session to run user flows and save a screenshot plus snapshot for every scenario under `features/<id>/evidence/`.
- Use `graphify query` instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase.
- Run `node scripts/homero/homero.mjs feature check --target . --id <id>` before implementation and `node scripts/homero/homero.mjs verify --target . --id <id>` before claiming completion.
- Do not commit, push, create a pull request, merge, or modify Figma.
