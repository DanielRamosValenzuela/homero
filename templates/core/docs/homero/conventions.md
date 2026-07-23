# Frontend conventions

## Tomaco

- Import Tomaco components directly from `tomaco-components`
- Do not create trivial wrappers only to rename or re-export a component
- Prefer Tomaco and project layout classes before custom CSS

## Forms

- Use one directory per form
- Keep `schema.ts`, `use<FormName>.ts`, and `index.tsx` together
- Export form types with `z.infer<typeof schema>`
- Prefer deterministic scaffolding for new forms:
  `node .\scripts\homero\new-form.mjs --name FormName --country cl`

## Styling

- Treat Figma output as reference, not as final code
- Avoid direct Tailwind carry-over if the project does not use Tailwind
- Prefer design tokens, CSS variables, and approved layout utilities

## UX and accessibility

- Preserve label clarity and field intent
- Keep validation messages user-facing and explicit
- Do not defer basic keyboard or focus behavior to later

## Testing

- Mirror source paths under `test/`, e.g. `src/ui/cl/LeadCaptureForm` ->
  `test/ui/cl/LeadCaptureForm`
- Do not colocate test files next to source files unless the repo already
  does so before Homero was installed

## Naming

- Component directories: PascalCase
- Hooks: `useX`
- Schemas: `schema`
- Inferred value types: `<FormName>Values`
- Once a naming decision is resolved for a shared concept (e.g. a
  country/form resolver), keep using it — do not reintroduce an older or
  more ambiguous name for the same concept
