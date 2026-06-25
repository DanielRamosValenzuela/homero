# Verification

Homero does not consider a frontend task done only because the UI exists.

## Required commands

Adjust the commands in `homero.config.json` to the real project scripts.

- lint
- typecheck
- test

## Required checks before closing a task

1. Structure matches the intended pattern
2. TypeScript is clean
3. Form validation paths are covered
4. UI matches the approved design intent
5. Tomaco usage respects the project conventions
6. Backend-dependent flows use recorded contracts or clearly marked draft mocks

## Figma-specific checks

- The implemented frame or node was the correct one
- Layout and spacing were adapted to project conventions
- Raw MCP output was translated to project code style
- Missing design intent was clarified instead of guessed

## Contract and mock checks

- Contract mode is recorded in `docs/homero/contracts.md`
- Mock data is realistic and anonymized
- Success, empty, validation error, business error, and server error states are represented when relevant
- Draft payload assumptions are listed as follow-up questions for backend

## Anti-patterns

- Marking a task done without running verification commands
- Blindly copying Tailwind or CSS from design tools
- Inventing backend payloads without recording assumptions
- Leaving placeholder scaffold fields in a production feature
