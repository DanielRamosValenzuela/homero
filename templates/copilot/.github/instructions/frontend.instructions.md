---
applyTo: "**/*.{ts,tsx,css,scss,md}"
---

# Homero Frontend Rules

For Tomaco component selection and API details, see
`.github/instructions/tomaco-design-system.instructions.md`; for layout/
hierarchy/pattern-reuse decisions, see
`.github/instructions/seguros-falabella-ui-ux.instructions.md`; for form
structure, see `.github/instructions/forms.instructions.md`. This file covers
what's left: general component hygiene, country structure, and the
client-boundary gotcha.

- Use Tomaco components and utility classes already present in the project.
  Import directly from `tomaco-components` — do not create trivial wrappers
  around a component that already does the job.
- Translate design output to Tomaco, not the other way around: adapt what
  Figma/MCP produced to the design system's real components and classes,
  don't ship raw generated markup and call it done.
- Do not introduce Tailwind, CSS Modules, or custom design-system primitives unless the repo already uses them.
- Keep UI changes scoped to the target flow, step, form, or component.
- Preserve multi-country structure and country-specific behavior explicitly.
- If a view does not vary in structure between countries (only in data),
  keep one implementation under a `global` path instead of forking it per
  country.
- Any file importing design-system components needs an explicit client
  boundary directive (e.g. `'use client'`), even without hooks: the package
  ships a single bundle with no subpath exports, so every import pulls React
  hooks and module-scope side effects into the graph. `import type` is exempt.
- Mirror test files under the project's test root instead of colocating them,
  unless the repo already colocates tests before Homero was installed.
- Prefer readable, testable component boundaries over broad refactors.

## Reject

- Raw Tailwind or generated CSS copied from MCP output without adaptation to Tomaco.
- New component abstractions with no product-level reason.
- Hardcoded styling when the design system already covers the need.
- A hand-built component that duplicates one `tomaco-components` already ships.
