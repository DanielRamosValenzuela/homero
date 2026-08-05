---
name: tomaco-design-system
description: >
  Authoritative source for exact Tomaco component names, published props, utility
  classes, and design tokens. Use this skill whenever code is about to be written
  that names a Tomaco component, passes props to one, or writes a className or token
  value — and whenever you need to confirm whether Tomaco already ships a component
  for a given need. This skill answers WHAT exactly exists in code; use
  seguros-falabella-ui-ux for WHY and WHERE (layout, hierarchy, pattern reuse).
argument-hint: "Component, prop, token, or 'does Tomaco have X?'"
---

# Tomaco design system

The design system is the npm package recorded in `homero.config.json` at
`product.designSystemPackage` (default `tomaco-components`). That package — not your
memory, not the Figma layout — is the source of truth for what exists in code.

## The one rule

**Never name a Tomaco component, prop, or token you have not confirmed against a
source in this session.** Component APIs drift between releases, and a confidently
wrong prop name costs more than an admitted gap: it compiles in the agent's head,
fails in review, and teaches the team not to trust the harness.

If you cannot confirm something, say exactly that — "I could not confirm whether
Tomaco ships a X; the generated inventory is missing/stale" — and ask. Under
`docs/homero/constitution.md` a hand-built lookalike of an existing Tomaco component
is a defect, not a style choice, so guessing here is what produces the defect.

## Resolution order

Work down this list and stop at the first source that answers the question. Say which
one you used.

1. **Code Connect.** If `homero-figma` returned a Code Connect mapping for the node,
   that IS the answer — it is the design system's own declaration of which code
   component this design element is. Nothing below overrides it.
2. **The generated inventory** at `references/component-api.md`. Regenerate it with
   `node scripts/homero/homero.mjs generate catalog --target .`. Check its header:
   if the recorded package version differs from what is installed today, treat it as
   stale and fall through to 3.
3. **The installed package itself**, under `node_modules/<designSystemPackage>` — its
   `package.json` `exports`, its `.d.ts` files, its Storybook if the repo has one.
   This is always authoritative and always current.
4. **Existing usage in this repo.** Grep for imports of the package. A component
   already used in production code with a given prop set is confirmed evidence.
5. **Nothing confirmed it.** Say so and ask. Do not proceed to invent an API.

## Answering "does Tomaco already have X?"

This is the question that prevents duplicate components, and it is asked by
`homero-implementer` before every new component.

- Search by **need**, not by category — "a field that masks a national ID" finds more
  than "input".
- An empty Code Connect result means *Code Connect has no mapping for that node*. It
  does **not** mean the component doesn't exist. Check sources 2–4 before concluding
  anything.
- Report the outcome as one of exactly three states: **confirmed exists** (name the
  component and the source), **confirmed absent** (say which sources you checked), or
  **could not determine** (say what is missing). "Probably not" is not an answer.

## Trampas verificadas en el código

Estas no se deducen y no salen en el catálogo generado (que trae nombre,
descripción y keywords, no props). Verificadas contra `tomaco-components@1.14.42`
— confirmá contra tu versión antes de darlas por ciertas.

**Nombres mal escritos que son los reales.** Escribir el correcto no funciona:

| Lo que ES | Lo que escribirías por reflejo |
| --- | --- |
| `clossable` (Alert) | `closable` |
| `terciary` (variante de Button) | `tertiary` |
| `localMontlyPrice` (ProductCard*) | `localMonthlyPrice` |
| `showRecomended`, `recomendedText` | `recommended…` (doble m) |
| `accordeon` (Summary, SummaryDev) | `accordion` |

**Componentes que no existen** con el nombre que esperarías: no hay `Modal` (es
`Dialog`) ni `Link` (es `Button` con `appearance="link"`).

**Otras**:

- `Button` no acepta `children`. La etiqueta va en `text`.
- `Input` tiene `labelText` con default `"Label Input"` — si no lo pasás, ese
  texto queda visible en producción.
- Las celdas de `Table` son objetos `{ cell: ReactNode }`, no nodos sueltos.
- `Icon.iconName` es una clase CSS de máscara, no una ruta a un archivo.
- `PaymentMethod` hardcodea `name="payment"` y `ProductCardSimple` hardcodea
  `id="radio-input"`: dos instancias en la misma página colisionan.
- `Accordion`, `QuantitySelector` y `Summary` son totalmente controlados y
  reciben dispatchers de `setState`, no callbacks simples.
- `Summary` y `SummaryDev` son duplicados idénticos byte a byte.
- `ProductCardFull` **trunca en silencio**: título 20/39, subtítulo 25,
  descuento 40, detalle 18, beneficios 30 caracteres.

## Handoff

- Layout, spacing, hierarchy, responsive structure, pattern reuse →
  `seguros-falabella-ui-ux`.
- Which Figma node maps to which component → `homero-figma` (it owns Figma access).
- General UI/UX judgment neither covers → `ui-ux-frontend-design`.

## Gotcha: `'use client'`

Tomaco components are client components. Any file importing the design system package
must have the `'use client'` directive at the top, or the build fails at runtime with
a server-component error that does not name the real cause. See
`.claude/rules/tomaco.md`.
