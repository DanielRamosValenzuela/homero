# Tomaco rule

Apply this rule whenever editing React UI components.

## Required conventions

- Before writing a new component, search the installed `tomaco-components`
  package (and Figma Code Connect mapping, if `homero-figma` found one) for
  one that already covers the need — ask by the specific need, not a
  generic category
- Import directly from `tomaco-components`
- Do not create trivial wrappers (a `Controller` wrapper for React Hook Form
  integration is a legitimate exception — see `tomaco-design-system`'s "React
  Hook Form integration" — it adds real logic, not just indirection)
- Layer styling in this order, confirmed as the real convention across
  production Falabella Seguros repos: Bootstrap-compatible classes for
  layout (`d-flex`, `gap-*`, `col-*`), Tomaco classes for tokens
  (`text-neutral60`, `bg-blueberry5`, spacing like `mb16`), and a small set
  of project-defined custom classes in the global stylesheet only for what
  neither covers (e.g. an arbitrary max-width Tomaco's containers don't
  provide — see `tomaco-design-system`'s css-utilities reference). Do not
  reach for custom CSS or inline styles before checking whether Bootstrap or
  Tomaco already covers it.
- Translate design output to Tomaco, not the other way around

## Reject

- Raw Tailwind copied from MCP output without adaptation
- New component abstractions with no product-level reason
- Hardcoded styling when the design system already covers the need
- A hand-built component that duplicates one `tomaco-components` already
  ships

## Gotcha

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

## Los estilos NO vienen del paquete npm

`tomaco-components` publica **solo JS** (`files: ["dist"]`, `exports` con `"."`
únicamente). No hay entrada Sass para consumidores y el `exports` map bloquea
cualquier import profundo de CSS. Si intentás
`import "tomaco-components/dist/tomaco-ui.css"` falla.

La hoja de estilos se carga fuera de banda, con un `<link>` en el `<head>`:

```html
<!-- QA -->
<link href="https://static-qa.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css" rel="stylesheet" />
<!-- Production -->
<link href="https://static.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css" rel="stylesheet" />
```

Es lo que hace el Storybook oficial de Tomaco, que depende del paquete solo para
los componentes React y no saca nada de CSS de `node_modules`.

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
  `.claude/skills/tomaco-design-system/references/css-utilities.md` para el
  detalle completo de clases/grilla/tokens verificado contra el Sass real.

## Utility-class traps

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
- **`.body-s` is declared twice**; the effective size is the second, **12px**,
  not the 14px the first declaration suggests.
- **Weights differ**: Tomaco `.text-regular` is 500, the grid's `.fw-normal` is 400.

When in doubt, read the built CSS or use the CSS custom properties — every Sass
variable is emitted on `:root`, so `var(--neutral5)` is durable where a utility
class is not.
