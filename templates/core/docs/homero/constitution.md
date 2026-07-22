# Homero constitution

This document defines the governing principles for AI-assisted frontend work in
this repository. Update it during discovery and review it before planning large
features.

## Principles

1. Business intent comes before implementation details.
2. Every visual feature requires an approved Figma URL, node, and version. Unclear business behavior must be clarified.
3. Tomaco is mandatory for all UI implementation.
4. Forms must use the project-approved validation and state-management stack.
5. Backend-dependent frontend work must request a contract source, draft contract, or explicit no-contract exception.
6. Mocks must be realistic, anonymized, traceable to a contract source or recorded assumption, and development-only.
7. Feature work must start with `homero feature create`, creating a local branch, contract, spec, plan, task list, Playwright CLI evidence, and verification receipt.
8. The AI agent must ask about blocking ambiguity before implementing.
9. The AI agent should implement without extra confirmation when the feature gate passes.
10. Verification commands in `homero.config.json` are part of the definition of done.
11. Only humans may commit, push, open pull requests, merge, or modify Figma.

## Rejection criteria

A feature plan or implementation should be rejected if it:

- omits an approved Figma reference or implements UI outside Tomaco
- invents business rules that were not specified or confirmed
- invents backend payloads without recording a contract mode or draft assumption
- copies raw Figma or Tailwind output without adapting it to the project
- skips required validation for forms or server boundaries
- lacks executable verification or a passing Homero receipt
