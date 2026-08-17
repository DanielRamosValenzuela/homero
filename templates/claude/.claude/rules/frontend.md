# Frontend rule

Apply this rule whenever editing any UI, style, or component file.

For Tomaco component selection and API details, see `rules/tomaco.md` and
the `tomaco-design-system` skill; for layout/hierarchy/pattern-reuse
decisions, see the `seguros-falabella-ui-ux` skill; for form structure, see
`rules/forms.md`. This file covers what's left: general component hygiene,
country structure, and test placement.

## Required conventions

- Do not introduce Tailwind, CSS Modules, or custom design-system primitives
  unless the repo already uses them
- Keep UI changes scoped to the target flow, step, form, or component
- Preserve multi-country structure and country-specific behavior explicitly
- If a view does not vary in structure between countries (only in data),
  keep one implementation under a `global` path instead of forking it per
  country
- Mirror test files under the project's test root instead of colocating
  them, unless the repo already colocates tests before Homero was installed
- Prefer readable, testable component boundaries over broad refactors

## Reject

- Raw Tailwind or generated CSS copied from MCP output without adaptation to
  Tomaco
- New component abstractions with no product-level reason
- A broad refactor scoped beyond the target flow, step, form, or component
