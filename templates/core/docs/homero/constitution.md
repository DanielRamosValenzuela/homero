# Homero constitution

This document defines the governing principles for AI-assisted frontend work in
this repository. Update it during discovery and review it before planning large
features.

## Principles

1. Business intent comes before implementation details.
2. Figma is the primary design and UX input, but unclear business behavior must be clarified.
3. Tomaco is the default design system unless the project explicitly records another decision.
4. Forms must use the project-approved validation and state-management stack.
5. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-contract exception.
6. Mocks must be realistic, anonymized, and traceable to a contract source or recorded assumption.
7. Feature work must produce a spec, plan, task list, and verification evidence when scope is non-trivial.
8. The AI agent must ask about blocking ambiguity before implementing.
9. The AI agent should implement without extra confirmation when the spec and plan are complete.
10. Verification commands in `homero.config.json` are part of the definition of done.

## Rejection criteria

A feature plan or implementation should be rejected if it:

- contradicts the selected design system without an explicit exception
- invents business rules that were not specified or confirmed
- invents backend payloads without recording a contract mode or draft assumption
- copies raw Figma or Tailwind output without adapting it to the project
- skips required validation for forms or server boundaries
- lacks an executable verification path
