# __PROJECT_NAME__ - Homero harness

Homero's CLI lives at `scripts/homero/homero.mjs`, copied there by
`homero init`. Every `homero <command>` mentioned in this repo's docs and
agents means `node scripts/homero/homero.mjs <command> --target . ...` —
except `init`/`validate`, which need the Homero source template and run via
`npx github:DanielRamosValenzuela/homero <command> ...`.

Read this repo in the following order before making non-trivial frontend changes:

1. `docs/homero/business.md`
2. `docs/homero/architecture.md`
3. `docs/homero/contracts.md`
4. `docs/homero/constitution.md`
5. `docs/homero/ai-workflow.md`
6. `docs/homero/agent-roles.md`
7. `docs/homero/conventions.md`
8. `docs/homero/verification.md`
9. `docs/homero/playwright-cli.md`
10. `docs/homero/knowledge-graph.md`

## Working model

- Homero is the process and frontend convention layer.
- Product docs define the business and delivery scope.
- Client adapters add tool-specific instructions without changing the core contract.
- Client adapters may install custom agents/subagents for Homero workflow roles.
- Skills are optional reusable procedures, not the foundation of the harness.
- The local generator is the deterministic fast path for repeated file patterns.

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

## Fast paths

- New form scaffold:
  `node .\scripts\homero\new-form.mjs --name UserInfoForm --country cl`
- Harness validation (needs the Homero source, not the local copy):
  `npx github:DanielRamosValenzuela/homero validate --target . --client copilot`
- Feature gate:
  `node scripts/homero/homero.mjs feature check --target . --id FEAT-001`
- Feature verification receipt:
  `node scripts/homero/homero.mjs verify --target . --id FEAT-001`
- Knowledge graph refresh + query:
  `graphify src --update` then `graphify query "<question>"`
