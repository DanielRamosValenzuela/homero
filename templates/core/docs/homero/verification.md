# Verification

Homero does not consider a frontend task done only because the UI exists.

## Required commands

Adjust the commands in `homero.config.json` to the real project scripts.

- lint
- typecheck
- test
- e2e: Playwright Test

## Feature gate

Every non-trivial frontend feature must start with:

```text
node scripts/homero/homero.mjs feature create --target . --id <id> --name <name> --figma <url> --figma-version <version> --contract-mode <mode> ...
```

It creates a local `feature/<id>-<slug>` branch without committing, plus:

- `features/<id>/feature.json`: the executable feature contract
- `features/<id>/evidence/playwright-cli.json`: browser evidence manifest
- `specs/<id>-<slug>/`: human-readable spec, plan, and tasks

`homero feature check` blocks a feature when Figma, Tomaco, contracts, development mocks, acceptance criteria, open questions, responsive coverage, or Playwright CLI evidence are incomplete.

## Figma and visual fidelity

- Figma is mandatory for visual frontend work. Record its URL, node, and approved version in `feature.json`.
- Tomaco is mandatory. Figma output must be mapped to existing Tomaco components and design tokens.
- Compare desktop and mobile screenshots against approved browser baselines with the configured visual-diff threshold.
- Do not update visual baselines or accept a visual diff without human review.

## Required checks before closing a task

1. Structure matches the intended pattern
2. TypeScript is clean
3. Form validation paths are covered
4. UI matches the approved design intent
5. Tomaco usage respects the project conventions
6. Backend-dependent flows use recorded contracts or clearly marked draft mocks
7. Test files mirror the source path convention recorded in `docs/homero/conventions.md`
8. Files importing the design system declare the required client boundary directive

## Figma-specific checks

- The implemented frame or node was the correct one
- Layout and spacing were adapted to project conventions
- Raw MCP output was translated to project code style
- Missing design intent was clarified instead of guessed
- The captured Figma version is the approved source for the feature

## Contract and mock checks

- Contract mode is recorded in `docs/homero/contracts.md`
- Mock data is realistic and anonymized
- Success, empty, validation error, business error, and server error states are represented when relevant
- Draft payload assumptions are listed as follow-up questions for backend
- If a real API diverges or fails, record the failure and use registered mocks only in development
- Production mock fallback is prohibited

## Playwright CLI evidence

The agent must use Playwright CLI for real browser validation. For every required scenario, save both a screenshot and an accessibility snapshot below `features/<id>/evidence/`, then record a passed scenario in `playwright-cli.json`.

Example:

```json
{
	"schemaVersion": 1,
	"featureId": "FEAT-001",
	"session": "homero-FEAT-001",
	"scenarios": [
		{
			"name": "user completes the quote form",
			"status": "passed",
			"screenshot": "evidence/screenshots/quote-desktop.png",
			"snapshot": "evidence/snapshots/quote-desktop.yaml"
		}
	]
}
```

## Receipt

Run `node scripts/homero/homero.mjs verify --target . --id <id>` only after the feature gate passes. It runs the configured lint, typecheck, test, and E2E commands, then writes an immutable verification receipt with command output, branch, and Git HEAD under `features/<id>/receipts/`.

## Anti-patterns

- Marking a task done without running verification commands
- Blindly copying Tailwind or CSS from design tools
- Inventing backend payloads without recording assumptions
- Leaving placeholder scaffold fields in a production feature
- Marking a feature as done without a passing Homero receipt
