# Playwright CLI procedure

Use Playwright CLI to validate the implemented user experience in a real browser.
This is browser evidence for the feature contract; it does not replace versioned
Playwright Test coverage.

## Preconditions

1. Read `features/<id>/feature.json` and use its exact feature ID.
2. Start the repository's configured local development environment.
3. Confirm the CLI is available with `pnpm exec playwright-cli --help`. If it is
   unavailable, ask the user to run
   `node scripts/homero/homero.mjs setup playwright --target .`; do not
   install global tools silently.
4. Use a named session: `homero-<id>`.

## Required flow

Use the exact command configured in `homero.config.json` when the repository
overrides the default CLI command.

```text
pnpm exec playwright-cli -s=homero-<id> open <local-url>
pnpm exec playwright-cli -s=homero-<id> snapshot --filename=features/<id>/evidence/snapshots/<scenario>-desktop.yaml
pnpm exec playwright-cli -s=homero-<id> screenshot --filename=features/<id>/evidence/screenshots/<scenario>-desktop.png
pnpm exec playwright-cli -s=homero-<id> open <local-url> --mobile
pnpm exec playwright-cli -s=homero-<id> snapshot --filename=features/<id>/evidence/snapshots/<scenario>-mobile.yaml
pnpm exec playwright-cli -s=homero-<id> screenshot --filename=features/<id>/evidence/screenshots/<scenario>-mobile.png
```

Drive the real user flow with snapshot references, role locators, or test IDs.
Exercise each relevant success, validation, empty, business-error, and
server-error state. When the real API is unavailable or violates its recorded
contract, use the registered development mock rather than a production fallback.

## Evidence manifest

After each scenario passes, add it to
`features/<id>/evidence/playwright-cli.json`. Each scenario must reference files
inside the feature's `evidence/` directory and include a passed status, screenshot,
and accessibility snapshot. Use distinct desktop and mobile scenarios when their
layouts differ.

## Completion

1. Run the focused persistent Playwright Test suite configured in
   `homero.config.json`.
2. Run `node scripts/homero/homero.mjs feature check --target . --id <id>` from the feature branch.
3. Run `node scripts/homero/homero.mjs verify --target . --id <id>` from the same branch.
4. Do not update visual baselines, commit, push, create a pull request, merge, or
   modify Figma. A human owns those actions.