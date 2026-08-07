---
applyTo: "**/ui/**/*.{ts,tsx}"
---

# Homero Form Rules

Apply whenever editing a form or creating a new form under `paths.uiRoot`
(default `src/ui`).

## Required pattern

1. One directory per form
2. `schema.ts`
3. `use<FormName>.ts`
4. `index.tsx`
5. Mirror the test file under the test root instead of colocating it, e.g.
   `src/ui/cl/LeadCaptureForm` -> `test/ui/cl/LeadCaptureForm`

## Required conventions

- Use React Hook Form + Zod.
- Export the value type with `z.infer<typeof schema>`.
- Keep business-specific validation messages explicit.
- Keep layout and Tomaco wiring in the component layer.
- Keep durable form logic in the hook.
- If the form does not vary in structure between countries (only in data),
  keep a single implementation under a `global` path instead of forking it
  per country.

## Fast path

Use `node scripts/homero/new-form.mjs --name FormName --country cl` before
hand-writing the structure.
