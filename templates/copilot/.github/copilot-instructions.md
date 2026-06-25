# Homero Copilot Instructions

Before making non-trivial frontend changes, read:

1. `AGENTS.md`
2. `docs/homero/business.md`
3. `docs/homero/architecture.md`
4. `docs/homero/conventions.md`
5. `docs/homero/verification.md`

Use Homero as the harness contract:

- Preserve Tomaco and existing project conventions over generated CSS or Tailwind-style output.
- Treat Figma as input that must be adapted to the repo, not copied literally.
- For backend-dependent features, request a contract source, draft contract, or explicit no-contract exception before inventing payloads.
- Use realistic anonymized mocks so frontend work can proceed before backend integration.
- Ask for missing business context when behavior is ambiguous.
- Prefer `scripts/homero/new-form.mjs` for repeated form scaffolds.
- Close tasks with the verification steps listed in `docs/homero/verification.md`.
