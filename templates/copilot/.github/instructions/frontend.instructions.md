---
applyTo: "**/*.{ts,tsx,css,scss,md}"
---

# Homero Frontend Rules

- Use Tomaco components and utility classes already present in the project.
- Before writing a new component, search the installed `tomaco-components`
  package (and Figma Code Connect mapping, if `homero-figma` found one) for
  one that already covers the need — ask by the specific need, not a
  generic category. A hand-built component that duplicates one Tomaco
  already ships is a defect, not a style choice.
- Do not introduce Tailwind, CSS Modules, or custom design-system primitives unless the repo already uses them.
- Keep UI changes scoped to the target flow, step, form, or component.
- Use React Hook Form with Zod for forms, and derive value types with `z.infer<typeof schema>`.
- Preserve multi-country structure and country-specific behavior explicitly.
- If a view or form does not vary in structure between countries (only in
  data), keep one implementation under a `global` path instead of forking it
  per country.
- Any file importing design-system components needs an explicit client
  boundary directive (e.g. `'use client'`), even without hooks, if the
  package calls browser-only APIs like `createContext` internally.
- Mirror test files under the project's test root instead of colocating them,
  unless the repo already colocates tests before Homero was installed.
- Prefer readable, testable component boundaries over broad refactors.
