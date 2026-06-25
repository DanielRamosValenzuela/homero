---
applyTo: "**/*.{ts,tsx,css,scss,md}"
---

# Homero Frontend Rules

- Use Tomaco components and utility classes already present in the project.
- Do not introduce Tailwind, CSS Modules, or custom design-system primitives unless the repo already uses them.
- Keep UI changes scoped to the target flow, step, form, or component.
- Use React Hook Form with Zod for forms, and derive value types with `z.infer<typeof schema>`.
- Preserve multi-country structure and country-specific behavior explicitly.
- Prefer readable, testable component boundaries over broad refactors.
