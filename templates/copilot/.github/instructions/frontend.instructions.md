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
  around a component that already does the job (a `Controller` wrapper for
  React Hook Form integration is a legitimate exception — see
  `tomaco-design-system.instructions.md`'s "React Hook Form integration" —
  it adds real logic, not just indirection).
- Layer styling in this order, confirmed as the real convention across
  production Falabella Seguros repos: Bootstrap-compatible classes for
  layout (`d-flex`, `gap-*`, `col-*`), Tomaco classes for tokens
  (`text-neutral60`, `bg-blueberry5`, spacing like `mb16`), and a small set
  of project-defined custom classes in the global stylesheet only for what
  neither covers (e.g. an arbitrary max-width Tomaco's containers don't
  provide — see `tomaco-css-utilities.md`). Do not reach for custom CSS or
  inline styles before checking whether Bootstrap or Tomaco already covers
  it.
- Translate design output to Tomaco, not the other way around: adapt what
  Figma/MCP produced to the design system's real components and classes,
  don't ship raw generated markup and call it done.
- Do not introduce Tailwind, CSS Modules, or custom design-system primitives unless the repo already uses them.
- Keep UI changes scoped to the target flow, step, form, or component.
- Preserve multi-country structure and country-specific behavior explicitly.
- If a view does not vary in structure between countries (only in data),
  keep one implementation under a `global` path instead of forking it per
  country.
- Mirror test files under the project's test root instead of colocating them,
  unless the repo already colocates tests before Homero was installed.
- Prefer readable, testable component boundaries over broad refactors.

## `'use client'` gotcha

- Any file that imports from `tomaco-components` needs `'use client'` at the
  top, even if the file itself uses no hooks. The reason is **packaging, not
  any one component**: the package ships a single bundle (`exports` has only
  `"."` → `dist/bundle.esm.js`, no subpath exports) built from one flat
  barrel. Importing `Badge` therefore loads the same module that imports
  `useState`/`useEffect`/`useId` from react and that inlines `react-select`
  and `react-datepicker` — they are devDependencies and are not listed in
  rollup's `external`, so they get bundled in, bringing `@emotion`'s
  `createContext` with them.
- Do **not** try to verify this by grepping Tomaco for `createContext`. Its
  own source has none and never did. The context arrives through inlined
  third-party code; the hooks are what actually break the RSC build. A rule
  whose stated reason is falsifiable in ten seconds is a rule someone deletes.
- Genuinely presentational components do exist in the source (Badge,
  Breadcrumbs, Card, Header, Icon, ListItem, Table, Tooltip — no hooks, no
  context, no handlers). They are still not safe to import from a Server
  Component, because the exports map offers no way to import them in
  isolation.
- `import type { ... } from "tomaco-components"` is erased at compile time
  and does **not** need `'use client'`.
- This is a workaround for a packaging gap, not a law. Re-check it when
  Tomaco next bumps: if it ships per-component subpath exports or a
  `'use client'` banner, narrow or drop the rule.

## Reject

- Raw Tailwind or generated CSS copied from MCP output without adaptation to Tomaco.
- New component abstractions with no product-level reason.
- Hardcoded styling when the design system already covers the need.
- A hand-built component that duplicates one `tomaco-components` already ships.
