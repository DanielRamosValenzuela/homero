---
applyTo: "**/*.{ts,tsx}"
---

# Homero Tomaco Design System Rules

Authoritative source for exact Tomaco component names, published props, utility
classes, and design tokens. Answers WHAT exactly exists in code — use
`.github/instructions/seguros-falabella-ui-ux.instructions.md` for WHY and WHERE
(layout, hierarchy, pattern reuse).

The design system is the npm package recorded in `homero.config.json` at
`product.designSystemPackage` (default `tomaco-components`). That package — not
memory, not the Figma layout — is the source of truth for what exists in code.

## The one rule

**Never name a Tomaco component, prop, or token that hasn't been confirmed against
a source in this session.** Component APIs drift between releases, and a
confidently wrong prop name costs more than an admitted gap: it compiles in the
model's head, fails in review, and teaches the team not to trust the harness.

If something can't be confirmed, say exactly that — "could not confirm whether
Tomaco ships a X; the generated inventory is missing/stale" — and ask. Under
`docs/homero/constitution.md` a hand-built lookalike of an existing Tomaco
component is a rejection, not a style note, so guessing here is what produces the
rejection.

Before writing code against a specific component, also check
`.github/instructions/tomaco-component-gotchas.md` for that component's name — a
manually-verified list of behavioral traps (misleading defaults, silent
truncation, hardcoded ids, props that compile but do nothing) that no generated
catalog or `.d.ts` file will surface.

For CSS utility classes, the grid, and color tokens, use
`.github/instructions/tomaco-css-utilities.md` — an exhaustive positive
reference (patterns and ranges, not just traps), verified against the real
`styles/*.sass` sources and cross-checked against the design system's own
upstream skill. It documents two Tomaco-specific grid overrides that don't
match stock Bootstrap (containers capped at 1152px past `lg`, and a 32px
default row gutter) — read it before assuming a Bootstrap-familiar grid value
applies unchanged.

**The npm package and the deployed stylesheet are versioned independently.**
`tomaco-components` (your lockfile) governs components and TypeScript props;
the `tomaco-ui.css` deployed to static hosts governs which CSS classes exist at
runtime — they are not guaranteed to be on the same patch. See
`.github/instructions/tomaco-css-utilities.md` for both static URLs (QA and
Production) and what to do when they might disagree.

## Resolution order

Work down this list and stop at the first source that answers the question. State
which one was used.

1. **Code Connect.** If `homero-figma` returned a Code Connect mapping for the
   node (via the `figma/get_code_connect_map` / `figma/get_context_for_code_connect`
   tools), that IS the answer — the design system's own declaration of which code
   component this design element is. Nothing below overrides it.
2. **The generated inventory** at
   `.github/instructions/tomaco-component-api.md` (written by `homero init`/
   `upgrade`/`generate catalog` once the design-system package is installed —
   see the placeholder note at the top of that file if it still says
   "NOT GENERATED YET"). Regenerate it with
   `node scripts/homero/homero.mjs generate catalog --target .`. If the recorded
   package version differs from what's installed today, treat it as stale and
   fall through to step 3.
3. **The installed package itself**, under `node_modules/<designSystemPackage>` —
   its `package.json` `exports`, its `.d.ts` files, its Storybook if the repo has
   one. Always authoritative, always current.
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

This is the question that prevents duplicate components, asked before every new
component.

- Search by **need**, not by category — "a field that masks a national ID" finds
  more than "input".
- An empty Code Connect result means *Code Connect has no mapping for that node*,
  not "the component doesn't exist." Check sources 2–4 before concluding
  anything.
- Report one of exactly three states: **confirmed exists** (name the component and
  the source), **confirmed absent** (say which sources were checked), or **could
  not determine** (say what's missing). "Probably not" is not an answer.

## Verified gotchas — quick reference

Full per-component detail in `.github/instructions/tomaco-component-gotchas.md`
(auditoría completa de los 40 componentes reales, contra `tomaco-components@1.14.42`
— confirmar contra la versión instalada antes de darlas por ciertas). Acá abajo
solo los patrones que se repiten entre varios componentes.

**Nombres mal escritos que son los reales**:

| Lo que ES | Lo que escribirías por reflejo |
| --- | --- |
| `clossable` (Alert) | `closable` |
| `terciary` (variante de Button) | `tertiary` |
| `localMontlyPrice` (ProductCard*) | `localMonthlyPrice` |
| `showRecomended`, `recomendedText` | `recommended…` (doble m) |
| `accordeon` (Summary, SummaryDev) | `accordion` |

**Componentes que no existen** con el nombre esperado: no hay `Modal` (es
`Dialog`) ni `Link` (es `Button` con `appearance="link"`). Callbacks sin
convención fija: `Tab` usa `actionAnchor(idAnchor)`, no `onChange`/`onClick`;
`Feedback.setShowAlert` es el `onClick` crudo del botón de cerrar pese al nombre,
no el dispatcher de `useState`.

**Patrones transversales**:

- **Texto placeholder visible en producción si te olvidás de pasarlo**:
  `Input`/`Select`/`TextArea.labelText` (`"Label Input"`),
  `Alert`/`CheckBox`/`RadioButton`/`SelectableCard.children` (`"Lorem Ipsum"` o
  similar), `ComparisonCard.title`/`.footerText`, `Input.errorText`
  (`"Campo inválido"`, español fijo), `Header.logo` (URL real del logo CL),
  `ProductCardFull.promoTagText` (banner promocional completo,
  `showPromoTag=true` de default).
- **`id`/`name` con default compartido** — colisionan con 2+ instancias en la
  misma página: `CheckBox.name` (`"checkbox"`), `QuantitySelector.name`
  (`"quantity"`), `Select`/`Upload.id`+`.name` (`"select"`/`"upload"`),
  `InputDateLite.id` (`"datepicker"`), ids de checkbox/radio de `ListItem` sin
  `id` propio.
- **Totalmente controlados, sin `defaultChecked`/fallback**: `PaymentMethod`
  (necesita `checkedId` devuelto en cada click), `Accordion`/
  `QuantitySelector`/`Summary` (dispatchers de `setState`, no callbacks
  simples), `InputDate.defaultDate` (pese al nombre, es el `selected`
  controlado de react-datepicker).
- **Props que compilan pero no hacen nada en runtime**: `Select` no spreadea
  `...rest` pese a extender `SelectHTMLAttributes` completo (`multiple`,
  `size`, `onClick` no tienen efecto); `Tooltip.iconName`/`.imgSrc` no tocan
  el ícono visible del trigger; `SelectSearch.isClearable` no existe como
  prop (hardcodeado a `false`).
- **Truncado silencioso**: `ProductCardFull` trunca 11 campos distintos, cada
  uno con su propio límite — ver el archivo de referencia completo.

**Otras**: `Button` no acepta `children` (la etiqueta va en `text`);
`RadioButton` al revés pone la label en `children`. Las celdas de `Table` son
objetos `{ cell: ReactNode }`, pero `header`/`footer` son `ReactNode` crudo —
envolverlos igual que `data` tira "Objects are not valid as a React child".
`Icon.iconName` es una clase CSS de máscara, no una ruta a un archivo.
`PaymentMethod` hardcodea `name="payment"` y `ProductCardSimple` hardcodea
`id="radio-input"`. `Summary`/`SummaryDev` son duplicados idénticos byte a
byte, incluido el mismo bug de layout en `productsList`.

## CSS and stylesheet gotchas

### Los estilos NO vienen del paquete npm

`tomaco-components` publica **solo JS** (`files: ["dist"]`, `exports` con `"."`
únicamente). No hay entrada Sass para consumidores, y el `exports` map bloquea
cualquier import profundo de CSS — `import "tomaco-components/dist/tomaco-ui.css"`
falla.

La hoja de estilos se carga fuera de banda, con un `<link>` en el `<head>`:

```html
<!-- QA -->
<link href="https://static-qa.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css" rel="stylesheet" />
<!-- Production -->
<link href="https://static.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css" rel="stylesheet" />
```

Es lo que hace el Storybook oficial de Tomaco: depende del paquete solo para los
componentes React y no saca nada de CSS de `node_modules`.

Consecuencias prácticas:

- Si los componentes se ven sin estilo, el problema es el `<link>` faltante, no
  el import de React. No lo "arregles" escribiendo CSS propio.
- Las clases utilitarias y las CSS custom properties (`var(--neutral5)`) existen
  solo si esa hoja está cargada.
- Confirmá con el equipo cuál es la URL vigente antes de asumir esta — puede
  estar versionada o servida desde otro entorno.
- El paquete npm (`tomaco-components`, tu lockfile) y el `tomaco-ui.css`
  desplegado en static tienen ciclos de release **independientes** — no
  asumas que van en el mismo patch. Ver
  `.github/instructions/tomaco-css-utilities.md` para el detalle completo de
  clases/grilla/tokens verificado contra el Sass real.

### Utility-class traps

Tomaco's stylesheet loads its own helpers *after* a Bootstrap-like grid, so
several familiar class names resolve to something else. Verified in the built
`dist/tomaco-ui.css`. Do not write utility classes from Bootstrap muscle memory.

- **`.px-1` … `.px-5` are `font-size`, not horizontal padding.** `helpers.sass`
  emits `.px-{n} { font-size: {n}px !important }` after the grid's padding rule,
  same specificity, same `!important` — so the later one wins. `.px-3` gives you
  3px text. Only `.px-0` still means padding.
- **Tomaco's directional helpers have no dash before the number**: `.mb16`,
  `.pt24` (2px steps, 0–100). Bootstrap's are `.mb-3` (rem scale, 0–5).
  `.mb-16` is not a class at all and silently does nothing.
- **Breakpoint suffixes collide and are offset by one step.** Tomaco:
  `sm=768 md=992 lg=1200 xl=1280`. The bundled grid: `sm=576 md=768 lg=992
  xl=1200 xxl=1400`. So `.mt-sm-16` fires at 768px but `.mt-sm-3` fires at 576px.
- **`.body-s` is declared twice**; the effective size is the second,
  **12px**, not the 14px the first declaration suggests.
- **Weights differ**: Tomaco's `.text-regular` is 500, the bundled grid's
  `.fw-normal` is 400.

When in doubt, read the built CSS or use the CSS custom properties — every Sass
variable is emitted on `:root`, so `var(--neutral5)` is durable where a utility
class name is not.

## React Hook Form integration

Tomaco components are not natively RHF-controlled — they take `value`/`onChange` (or a component-specific controlled-prop pair — see `tomaco-component-gotchas.md`'s "totally controlled, no fallback" traps), not a `register()`-compatible ref. The confirmed, real pattern across production Falabella Seguros forms: a thin per-input-type wrapper (e.g. `InputController`, `InputDateController`, `CheckBoxController`, `SelectController`, `SelectSearchController`) that wraps React Hook Form's own `Controller`, taking `name`/`control` plus the Tomaco component's normal props, and wires `field.value`/`field.onChange` and `fieldState.error` into the underlying Tomaco atom. Check whether the repo already has one for the input type you need before writing a new one — this is genuinely repeated, load-bearing code across a form-heavy screen, not a one-off.

## Anti-pattern: trivial wrapper components

Do not create a wrapper component around a Tomaco atom that adds no real logic (no validation, no composition, no business rule) — just re-exporting the atom with a `displayName` and no actual behavior. Import directly from `tomaco-components` at the call site instead; this is confirmed as a real anti-pattern flagged by more than one production Falabella Seguros codebase's own internal conventions doc. The `Controller` wrappers above are a legitimate exception — they add real logic (RHF wiring), not just indirection.

## Handoff

- Layout, spacing, hierarchy, responsive structure, pattern reuse →
  `.github/instructions/seguros-falabella-ui-ux.instructions.md`.
- Which Figma node maps to which component → `homero-figma` (it owns Figma access).

## Gotcha: `'use client'`

Tomaco components are client components. Any file importing the design system
package must have `'use client'` at the top, or the build fails at runtime with
a server-component error that does not name the real cause — see
`.github/instructions/frontend.instructions.md`.
