# __PROJECT_NAME__ - Homero harness

Read this repo in the following order before making non-trivial frontend changes:

1. `docs/homero/business.md`
2. `docs/homero/architecture.md`
3. `docs/homero/contracts.md`
4. `docs/homero/constitution.md`
5. `docs/homero/ai-workflow.md`
6. `docs/homero/agent-roles.md`
7. `docs/homero/conventions.md`
8. `docs/homero/verification.md`

## Working model

- Homero is the process and frontend convention layer.
- Product docs define the business and delivery scope.
- Client adapters add tool-specific instructions without changing the core contract.
- Client adapters may install custom agents/subagents for Homero workflow roles.
- Skills are optional reusable procedures, not the foundation of the harness.
- The local generator is the deterministic fast path for repeated file patterns.

## Non-negotiable rules

1. Ask for missing discovery context before inventing business behavior.
2. Treat Figma as design input, not as the only source of truth.
3. Map UI to Tomaco and project conventions instead of copying raw Tailwind output.
4. Request backend contracts, draft contracts, or no-contract exceptions before inventing payloads.
5. Prefer the local Homero generator when creating a new form structure.
6. Do not bypass `docs/homero/verification.md` when closing a task.

## Fast paths

- New form scaffold:
  `node .\scripts\homero\new-form.mjs --name UserInfoForm --country cl`
- Harness validation:
  `homero validate --target . --client copilot`
