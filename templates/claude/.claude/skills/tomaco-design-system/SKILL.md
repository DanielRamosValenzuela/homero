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
is a rejection, not a style note, so guessing here is what produces the rejection.

Before writing code against a specific component, also check
`references/component-gotchas.md` for that component's name — it's a
manually-verified list of behavioral traps (misleading defaults, silent
truncation, hardcoded ids, props that compile but do nothing) that no generated
catalog or `.d.ts` file will surface.

For CSS utility classes, the grid, and color tokens, use
`references/css-utilities.md` — an exhaustive positive reference (patterns and
ranges, not just traps), verified against the real `styles/*.sass` sources and
cross-checked against the design system's own upstream skill. It documents two
Tomaco-specific grid overrides that don't match stock Bootstrap (containers
capped at 1152px past `lg`, and a 32px default row gutter) — read it before
assuming a Bootstrap-familiar grid value applies unchanged.

**The npm package and the deployed stylesheet are versioned independently.**
`tomaco-components` (your lockfile) governs components and TypeScript props;
the `tomaco-ui.css` deployed to static hosts governs which CSS classes exist at
runtime — they are not guaranteed to be on the same patch. See
`references/css-utilities.md` for both static URLs (QA and Production) and
what to do when they might disagree.

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

**Tomaco MCP (optional, ask before assuming it's there).** The design-system
team also ships a separate `tomaco-mcp-server` with live component/prop/CSS
query tools — not installed by default in this harness (`mcp.example.json`
shows it as a commented example, not a live entry). If a project's workspace
has it configured, it's a strong signal for anything version-sensitive and can
sit ahead of step 2 above; if it isn't configured, don't claim to have queried
it.

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
— confirmá contra tu versión antes de darlas por ciertas. Auditoría completa de
los 40 componentes en `references/component-gotchas.md`; acá abajo solo los
patrones que se repiten entre varios componentes, para un skim rápido — buscá el
componente puntual en esa referencia antes de escribir código contra él.

**Nombres mal escritos que son los reales.** Escribir el correcto no funciona:

| Lo que ES | Lo que escribirías por reflejo |
| --- | --- |
| `clossable` (Alert) | `closable` |
| `terciary` (variante de Button) | `tertiary` |
| `localMontlyPrice` (ProductCard*) | `localMonthlyPrice` |
| `showRecomended`, `recomendedText` | `recommended…` (doble m) |
| `accordeon` (Summary, SummaryDev) | `accordion` |

**Componentes que no existen** con el nombre que esperarías: no hay `Modal` (es
`Dialog`) ni `Link` (es `Button` con `appearance="link"`). Los callbacks tampoco
siguen una convención fija: `Tab` usa `actionAnchor(idAnchor)`, no
`onChange`/`onClick`; `Feedback.setShowAlert` es el `onClick` crudo del botón de
cerrar pese al nombre, no el dispatcher de `useState`.

**Patrones transversales** (detalle y evidencia por componente en
`references/component-gotchas.md`):

- **Texto placeholder que queda visible en producción si te olvidás de
  pasarlo**: `Input`/`Select`/`TextArea.labelText` (`"Label Input"`),
  `Alert`/`CheckBox`/`RadioButton`/`SelectableCard.children` (`"Lorem Ipsum"` o
  similar), `ComparisonCard.title`/`.footerText` (los dos, independientes),
  `Input.errorText` (`"Campo inválido"`, español fijo), `Header.logo` (URL real
  del logo CL, no un placeholder), `ProductCardFull.promoTagText` (banner
  promocional completo, con `showPromoTag=true` de default).
- **`id`/`name` con default compartido** — colisionan con 2+ instancias en la
  misma página: `CheckBox.name` (`"checkbox"`), `QuantitySelector.name`
  (`"quantity"`), `Select`/`Upload.id`+`.name` (`"select"`/`"upload"`),
  `InputDateLite.id` (`"datepicker"`), ids de checkbox/radio de `ListItem` sin
  `id` propio (colisiona *entre* instancias distintas, no solo dentro de una).
- **Totalmente controlados, sin `defaultChecked`/fallback** — cablear solo el
  callback intuitivo deja el componente sin reaccionar: `PaymentMethod`
  (necesita `checkedId` devuelto en cada click), `Accordion`/`QuantitySelector`/
  `Summary` (dispatchers de `setState`, no callbacks simples),
  `InputDate.defaultDate` (pese al nombre, es el `selected` controlado de
  react-datepicker).
- **Props que compilan pero no hacen nada en runtime**: `Select` extiende
  `SelectHTMLAttributes` completo pero no spreadea `...rest` (`multiple`,
  `size`, `onClick` no tienen efecto); `Tooltip.iconName`/`.imgSrc` no tocan el
  ícono visible del trigger; `SelectSearch.isClearable` no existe como prop
  (hardcodeado a `false`).
- **Truncado silencioso**: `ProductCardFull` trunca 11 campos distintos, cada
  uno con su propio límite — la lista de 5 campos de acá abajo no es completa,
  ver `references/component-gotchas.md`.

**Otras**:

- `Button` no acepta `children`. La etiqueta va en `text`. `RadioButton`, al
  revés, pone la label en `children` — convención opuesta dentro de la misma
  librería.
- Las celdas de `Table` son objetos `{ cell: ReactNode }`; `header`/`footer` en
  cambio son `ReactNode` crudo — envolverlos igual que `data` tira un error de
  React ("Objects are not valid as a React child").
- `Icon.iconName` es una clase CSS de máscara, no una ruta a un archivo.
- `PaymentMethod` hardcodea `name="payment"` y `ProductCardSimple` hardcodea
  `id="radio-input"`: dos instancias en la misma página colisionan (y el radio
  de `ProductCardSimple.showCheck` tampoco tiene `checked`/`onChange`/`name` —
  es puramente decorativo, no controlable desde afuera).
- `Summary` y `SummaryDev` son duplicados idénticos byte a byte — incluido el
  mismo bug: en `productsList`, el layout del precio de cada ítem depende del
  `paymentLogo` de nivel superior, no del `product.paymentLogo` de ese ítem.
- `ProductCardFull` **trunca en silencio**: título 20/39, subtítulo 25,
  descuento 40, detalle 18, beneficios 30 caracteres (y 7 campos más — ver
  `references/component-gotchas.md`).

## React Hook Form integration

Tomaco components are not natively RHF-controlled — they take `value`/`onChange` (or a component-specific controlled-prop pair, see the "Totalmente controlados" traps above), not a `register()`-compatible ref. The confirmed, real pattern across production Falabella Seguros forms: a thin per-input-type wrapper (e.g. `InputController`, `InputDateController`, `CheckBoxController`, `SelectController`, `SelectSearchController`) that wraps React Hook Form's own `Controller`, taking `name`/`control` plus the Tomaco component's normal props, and wires `field.value`/`field.onChange` and `fieldState.error` into the underlying Tomaco atom. Check whether the repo already has one for the input type you need before writing a new one — this is genuinely repeated, load-bearing code across a form-heavy screen, not a one-off.

## Anti-pattern: trivial wrapper components

Do not create a wrapper component around a Tomaco atom that adds no real logic (no validation, no composition, no business rule) — just re-exporting the atom with a `displayName` and no actual behavior. Import directly from `tomaco-components` at the call site instead; this is confirmed as a real anti-pattern flagged by more than one production Falabella Seguros codebase's own internal conventions doc. The `Controller` wrappers above are a legitimate exception — they add real logic (RHF wiring), not just indirection.

## Handoff

- Layout, spacing, hierarchy, responsive structure, pattern reuse →
  `seguros-falabella-ui-ux`.
- Which Figma node maps to which component → `homero-figma` (it owns Figma access).

## Gotcha: `'use client'`

Tomaco components are client components. Any file importing the design system package
must have the `'use client'` directive at the top, or the build fails at runtime with
a server-component error that does not name the real cause. See
`.claude/rules/tomaco.md`.
