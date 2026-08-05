# __PROJECT_NAME__ - Homero harness

<!-- homero:managed — maintained by `homero upgrade`. Delete this line to own this file. -->

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by `homero init`.
Every `homero <command>` in this repo means
`node scripts/homero/homero.mjs <command> --target . ...` — except
`init`/`upgrade`/`validate`, which need the Homero source templates and run via
`npx github:DanielRamosValenzuela/homero <command> ...`.

Before non-trivial frontend work, read `docs/homero/` in this order:
`business.md`, `architecture.md`, `contracts.md`, `constitution.md`,
`ai-workflow.md`, `agent-roles.md`, `conventions.md`, `verification.md`,
`playwright-cli.md`, `knowledge-graph.md`.

## Non-negotiable rules

1. Ask for missing discovery context before inventing business behavior.
2. Every visual feature requires an approved Figma URL, node, and version before implementation.
3. Use Tomaco. Do not introduce another design system or copy raw Tailwind output.
4. Request backend contracts, draft contracts, or no-contract exceptions before inventing payloads.
5. Register development mocks from backend inputs or recorded draft contracts. Never use mock fallbacks in production.
6. Create features with `homero feature create`; do not begin a non-trivial feature without its contract and local feature branch.
7. Use Playwright CLI to inspect real user flows and save snapshot plus screenshot evidence under `features/<id>/evidence/`.
8. Do not bypass `docs/homero/verification.md` when closing a task.
9. Do not commit, push, create pull requests, merge, or modify Figma. Those actions belong to a human.
10. Use `graphify query` instead of broad manual file-by-file reads when exploring unfamiliar or large parts of the codebase — see `docs/homero/knowledge-graph.md`.
11. Never name a Tomaco component, prop, or token you have not confirmed against the generated inventory, the installed package, or a Code Connect mapping. Say you could not confirm it instead of guessing.

## Fast paths

- New form scaffold:
  `node .\scripts\homero\new-form.mjs --name UserInfoForm --country cl`
- Harness validation. Omit `--client` — it is read from `homeroClient` in the config,
  and the wrong one reports the other adapter's files as missing:
  `npx github:DanielRamosValenzuela/homero validate --target .`
- Harness update (preview first):
  `npx github:DanielRamosValenzuela/homero upgrade --target . --dry-run`
- Refresh the Tomaco component inventory after a version bump:
  `node scripts/homero/homero.mjs generate catalog --target .`
- Feature gate:
  `node scripts/homero/homero.mjs feature check --target . --id FEAT-001`
- Feature verification receipt:
  `node scripts/homero/homero.mjs verify --target . --id FEAT-001`
- Knowledge graph refresh + query:
  `graphify src --update` then `graphify query "<question>"`
- Wire the lint guardrail once per repo (`homero validate` warns while it is unwired):
  import `homero.eslint.config.mjs` into `eslint.config.js` — snippet in its header.
