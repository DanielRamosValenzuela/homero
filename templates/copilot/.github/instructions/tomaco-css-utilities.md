# Tomaco CSS utility classes and grid — exhaustive reference

> Verified two ways: against the official `tomaco-design-system` skill shipped
> inside the `tomaco-components` repo itself (`.github/skills/tomaco-design-system/`,
> installable via `npx skills add` — audited against v1.14.40), and independently
> against the real Sass sources (`styles/grid.sass`, `styles/variables.sass`,
> `styles/helpers.sass`) at `tomaco-components@1.14.42`. Where the two disagreed,
> this file follows the Sass source and says so.
>
> This file lists **patterns and ranges** — what the Sass build emits — not a
> literal dump of every selector in the compiled CSS. For an exact class string
> in doubt, check the deployed `tomaco-ui.css` (see below) or Tomaco MCP if your
> workspace has it configured (see `mcp.example.json` and the note at the bottom
> of this file).

## Where the runtime CSS actually comes from

Two independently versioned things exist and can be on different patch releases at
the same time — do not assume they match:

- **The npm package** (`tomaco-components`, your lockfile) — governs **components
  and their TypeScript props**. `dist/` ships JS only; there is no CSS entry point
  for consumers (see `.github/instructions/tomaco-design-system.instructions.md` —
  "Los estilos NO vienen del paquete npm").
- **`tomaco-ui.css`, deployed to static hosts** — governs **which utility classes
  and tokens exist in the browser**. Apps load it with a `<link>`, not from
  `node_modules`:
  - QA: `https://static-qa.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css`
  - Production: `https://static.fif.tech/insurance-assets/seguros-ui/css/tomaco-ui.css`

If a class you expect isn't rendering, check which environment's stylesheet is
loaded before assuming the class doesn't exist — a QA-only token showing up as
unstyled in a prod build is a version-skew symptom, not a typo.

---

## Tomaco-native spacing (from `helpers.sass`)

Pixel values, even numbers, no hyphen before the number.

| Pattern  | Range               | Example | Result                |
| -------- | -------------------- | ------- | ---------------------- |
| `ma-{N}` | 0–100 even            | `ma-16` | `margin: 16px`         |
| `pa-{N}` | 0–100 even            | `pa-8`  | `padding: 8px`         |
| `mt{N}`  | 0–100 even            | `mt16`  | `margin-top: 16px`     |
| `mr{N}`  | 0–100 even            | `mr8`   | `margin-right: 8px`    |
| `mb{N}`  | 0–100 even            | `mb24`  | `margin-bottom: 24px`  |
| `ml{N}`  | 0–100 even            | `ml4`   | `margin-left: 4px`     |
| `pt{N}`  | 0–100 even            | `pt12`  | `padding-top: 12px`    |
| `pr{N}`  | 0–100 even            | `pr16`  | `padding-right: 16px`  |
| `pb{N}`  | 0–100 even            | `pb32`  | `padding-bottom: 32px` |
| `pl{N}`  | 0–100 even            | `pl8`   | `padding-left: 8px`    |
| `gap-{N}`| 0–48 even             | `gap-16`| `gap: 16px`            |

Responsive directional spacing uses the **Tomaco-native breakpoints** (see
below), not the Bootstrap ones: `mt-{bp}-{N}`, `pl-{bp}-{N}`, etc. — e.g.
`mt-md-0` is `margin-top: 0` at ≥992px in this system.

**`px-{N}` is font-size, not padding** (`px-{1-100}` → `font-size: {N}px`). This
is the single most common trap in the library — see
`.github/instructions/tomaco-design-system.instructions.md` and
`.github/instructions/tomaco-component-gotchas.md` for the exact cascade reason
and the Bootstrap-scale `px-{0-5}` naming collision below.

---

## Typography classes (from `global.sass`)

| Class        | font-size | font-weight |
| ------------ | --------- | ----------- |
| `title-xl`   | 32px      | 400         |
| `title-l`    | 28px      | 400         |
| `title-m`    | 22px      | 400         |
| `title-s`    | 18px      | 400         |
| `heading-xl` | 22px      | 400         |
| `heading-l`  | 18px      | 400         |
| `heading-m`  | 12px      | 400         |
| `body-l`     | 16px      | —           |
| `body-m`     | 15px      | —           |
| `body-s`     | 14px / **12px** | — |

`body-s` is declared twice in the stylesheet; the effective size is the
**second** declaration, 12px, not the 14px the first suggests (already in
`.github/instructions/tomaco-design-system.instructions.md`).

Text weight: `text-light` (300), `text-semilight` (400), `text-regular` (500),
`text-semibold` (600), `text-bold` (700). `text-regular` (500) is not the same
weight as the Bootstrap-compatible `fw-normal` (400) — same trap as `body-s`,
two systems using an adjacent-sounding name for different values.

Line height: `line-height-{0-100 step 5}`, plus named `line-140`,
`line-height-normal`, `line-height-none`.

Text extras: `text-underline`, `text-hover-underline`, `text-justify`,
`text-left`, `text-right`.

---

## Color tokens

10 hue families, each with shades. Classes generated for `bg-`, `text-`, and
`border-color-` prefixes; every token is also a CSS custom property on `:root`.

| Family        | Shades                                          |
| ------------- | ------------------------------------------------ |
| `avocado`     | 5–90 (step 10, e.g. `avocado50`)                  |
| `lime`        | 5–90                                              |
| `orange`      | 5–90                                              |
| `cherry`      | 5–90                                              |
| `blueberry`   | 5–90                                              |
| `raspberry`   | 5–90                                              |
| `grape`       | 5–90                                              |
| `agave`       | 5–90                                              |
| `neutral`     | 0, 01, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100 |
| `midnight`    | 5–95 (step 5)                                     |

Semantic aliases (use these over a raw shade when the meaning, not the exact
color, is what matters): `primary` (avocado50), `white` (neutral0), `disabled`
(neutral15), `avocado-primary` (avocado40), `accent` (avocado60),
`neutral-primary` (neutral80), `neutral-secondary` (neutral70 in some contexts /
neutral60 in others — confirm against the CSS custom property, not this table,
if a semantic alias's shade matters for the task), `neutral-tertiary`
(neutral40), `secondary` (neutral60).

| Pattern                 | Example                            |
| ------------------------ | ----------------------------------- |
| `bg-{token}`             | `bg-avocado50`, `bg-neutral5`       |
| `text-{token}`           | `text-cherry60`, `text-secondary`   |
| `border-color-{token}`   | `border-color-neutral10`            |
| `bg-white-{neutral}`     | White on mobile, white→neutral gradient on desktop |
| `bg-50-50-white-{neutral}` | White on mobile, 50/50 split on desktop |

**Always prefer the CSS custom property (`var(--neutral5)`) over a pasted hex
literal in code** — it survives a palette/token rename that a hardcoded hex
would silently drift from.
`.github/instructions/tomaco-design-system.instructions.md` documents the same
rule.

Sass → CSS var → class traceability, for auditing a specific token:

| Sass variable                   | CSS custom property | Classes generated                                             |
| -------------------------------- | -------------------- | -------------------------------------------------------------- |
| `$avocado50`                     | `--avocado50`        | `bg-avocado50`, `text-avocado50`, `border-color-avocado50`     |
| `$primary` (`$avocado50`)        | `--primary`          | `bg-primary`, `text-primary`, `border-color-primary`           |
| `$textSecondary` (`$neutral60`)  | `--secondary`        | `text-secondary`, `bg-secondary`, `border-color-secondary`     |
| `$border` (`$neutral10`)         | `--border-color`      | `.border` (structural), plus `border-color-neutral10` (token)  |

---

## Border, radius, shadow

| Class            | Result                             |
| ---------------- | ----------------------------------- |
| `border`         | `1px solid var(--border-color)`     |
| `border-top/-right/-bottom/-left` | same, one side       |
| `border-{sm,md,lg,xl}-none` | removes border at that Tomaco-native breakpoint and up |

| Pattern | Values | Example | Result |
| --- | --- | --- | --- |
| `br-{N}` | 4, 6, 8, 12, 16, 24 | `br-8` | `border-radius: 8px` |
| `br-top-{N}` / `br-bottom-{N}` | same set | `br-top-12` | rounds only that pair of corners |
| `br-full` | — | — | `border-radius: 100%` |

| Class | Result |
| --- | --- |
| `shadow` | `0px 0px 1px 0px rgba(0,0,0,.05)` |
| `shadow-none` | none |
| `shadow-top` / `shadow-bottom` / `shadow-left` / `shadow-right` | directional soft shadow |
| `shadow-modal` | `0px 9px 18px 0px rgba(0,0,0,.05)` — the elevation `Dialog`/`CookieDialog` need |
| `shadow-filter` | `filter: drop-shadow(...)` variant, not `box-shadow` |

Elevation semantics (flat vs raised vs modal) live in
`.github/instructions/seguros-falabella-ui-ux.instructions.md` — this file only
lists the class names; that one says *when* to use each.

---

## Grid system (from `grid.sass`) — verified against source, not just the pattern doc

12-column, Bootstrap-shaped, **with Tomaco-specific overrides that differ from
stock Bootstrap defaults**. Read the two callouts below before assuming a
Bootstrap value applies unchanged.

### Containers

`container`, `container-fluid`, `container-sm`, `container-md`, `container-lg`,
`container-xl`, `container-xxl`.

| Breakpoint | min-width | `max-width` |
| --- | --- | --- |
| (none / `-fluid`) | — | 100% |
| `sm` | 576px | 540px |
| `md` | 768px | 720px |
| `lg` | 992px | 960px |
| `xl` | 1200px | **1152px** |
| `xxl` | 1400px | **1152px** |

**Tomaco override #1 — the container does not keep growing past `lg`.** Stock
Bootstrap's `xl`/`xxl` containers cap at 1140px/1320px+; Tomaco's `grid.sass`
caps **both `container-xl` and `container-xxl` at the same 1152px** as `lg`.
Confirmed directly in `styles/grid.sass` (not inferred from a pattern table).
This is also the exact figure the Seguros Figma foundations call
`Container.lg.SF` — see the cross-check note in
`.github/instructions/seguros-falabella-ui-ux.instructions.md`. Do not assume a
wider desktop viewport gets a wider container past 1152px without checking the
Figma source for that specific screen (some flows use a separate `OMNI`
container, see that note).

### Row

`row`, `row-cols-{1-6}`, `row-cols-auto`, `row-cols-{bp}-{1-6}`.

**Tomaco override #2 — the default row gutter is 32px, not Bootstrap's
1.5rem (24px).** `styles/grid.sass`: `.row { --bs-gutter-x: 32px; ... }`. A
bare `<div className="row">` with no `g-*` override therefore has wider column
gutters than a stock Bootstrap `.row` would. The numbered `g-{0-5}` utility
classes below still follow the Bootstrap rem scale when explicitly applied —
this override only changes the *unset default*.

### Columns and offsets

`col`, `col-auto`, `col-{1-12}`, `col-{bp}`, `col-{bp}-auto`, `col-{bp}-{1-12}`,
`offset-{1-11}`, `offset-{bp}-{0-11}`.

### Gutters (explicit override)

`g-{0-5}`, `gx-{0-5}` (horizontal only), `gy-{0-5}` (vertical only), plus
`{bp}` responsive variants of all three. Scale: 0=0, 1=0.25rem, 2=0.5rem,
3=1rem, 4=1.5rem, 5=3rem.

### Grid breakpoints (Bootstrap-compatible family — see the two-systems warning below)

`sm` 576px · `md` 768px · `lg` 992px · `xl` 1200px · `xxl` 1400px.

---

## Two breakpoint systems with the same prefix names — read before writing a responsive class

Tomaco ships **two independent responsive systems** that reuse the labels
`sm`/`md`/`lg`/`xl` at **different pixel widths**. Picking the wrong table for
the class family you're using silently fires at the wrong viewport.

### Tomaco-native (`mt-sm-*`, `pl-lg-*`, `w-md-*`, directional spacing/width)

From `$breaks` in `styles/variables.sass`. **No `xxl` tier** — the largest is `xl`.

| Prefix | min-width |
| --- | --- |
| `sm` | 768px |
| `md` | 992px |
| `lg` | 1200px |
| `xl` | 1280px |

### Bootstrap-compatible (`col-sm-*`, `d-md-flex`, `m-lg-3`, grid/flex/spacing)

From `grid.sass`/`utils.sass`. Has an `xxl` tier at 1400px that the
Tomaco-native system does not.

| Prefix | min-width |
| --- | --- |
| `sm` | 576px |
| `md` | 768px |
| `lg` | 992px |
| `xl` | 1200px |
| `xxl` | 1400px |

Concretely: `.mt-sm-16` (Tomaco-native) fires at **768px**; `.mt-sm-3`
(Bootstrap-scale) fires at **576px**. Same `sm` label, 192px apart.
`.github/instructions/tomaco-design-system.instructions.md` already flags this
collision for the directional-spacing case; this table is the exhaustive
version covering every class family, not just spacing.

---

## Bootstrap-compatible utilities (from `utils.sass` + `grid.sass`)

All families below have full responsive variants (base + `-sm-`/`-md-`/`-lg-`/`-xl-`/`-xxl-`
using the Bootstrap-compatible breakpoints above).

- **Display**: `d-none`, `d-inline`, `d-inline-block`, `d-block`, `d-grid`,
  `d-table`, `d-table-row`, `d-table-cell`, `d-flex`, `d-inline-flex` (+ `d-print-*`)
- **Flex direction**: `flex-row`, `flex-column`, `flex-row-reverse`, `flex-column-reverse`
- **Flex wrap**: `flex-wrap`, `flex-nowrap`, `flex-wrap-reverse`
- **Flex grow/shrink**: `flex-grow-{0,1}`, `flex-shrink-{0,1}`, `flex-fill`
- **Justify**: `justify-content-{start,end,center,between,around,evenly}`
- **Align items/self/content**: `align-items-*`, `align-self-*`, `align-content-*`
  (`{start,end,center,baseline,stretch}`, `between`/`around` on `-content-` only)
- **Order**: `order-first`, `order-{0-5}`, `order-last`
- **Spacing (Bootstrap rem scale, 0-5)**: `m-{0-5}`, `m-auto`, `mx-`/`my-`/`mt-`/
  `me-`/`mb-`/`ms-{0-5|auto}`, `p-{0-5}` and directional (`px-`/`py-`/`pt-`/`pe-`/
  `pb-`/`ps-`, no `auto` for padding). 0=0, 1=0.25rem, 2=0.5rem, 3=1rem, 4=1.5rem, 5=3rem.
  - **`px-{0-5}` collides with Tomaco-native `px-{1-100}` (font-size).** For values
    above 5 there's no ambiguity — Tomaco's font-size rule wins per the cascade
    order documented in `.github/instructions/tomaco-design-system.instructions.md`/
    `.github/instructions/tomaco-component-gotchas.md`. For values 0–5 the two
    rules are adjacent in the cascade; do not assume `px-3` behaves as spacing
    without checking the compiled `tomaco-ui.css` for the class you're about to
    ship, and prefer the unambiguous directional classes (`pt{N}`/`pl{N}`/etc.
    or `pt-{0-5}`/`pl-{0-5}` fully spelled out) over the shorthand
    `px-*`/`py-*` forms when it matters.
- **Sizing**: `w-{25,50,75,100,auto}`, `h-{25,50,75,100,auto}`, `mw-100`,
  `mh-100`, `vw-100`, `vh-100`, `min-vw-100`, `min-vh-100`
- **Position**: `position-{static,relative,absolute,fixed,sticky}`,
  `top-/bottom-/start-/end-{0,50,100}`, `fixed-top`, `fixed-bottom`, `sticky-{bp}-top`
- **Visibility**: `visible`, `invisible`, `visually-hidden`, `visually-hidden-focusable`
- **Float / overflow**: `float-{start,end,none}`, `overflow-{auto,hidden,visible,scroll}`
- **Text**: `text-{start,end,center}`, `text-{lowercase,uppercase,capitalize}`,
  `text-{wrap,nowrap}`, `text-truncate`, `text-break`,
  `text-decoration-{none,underline,line-through}`
- **Font**: `fw-{light,lighter,normal,bold,bolder}`, `fst-{italic,normal}`
- **Vertical align**: `align-{baseline,top,middle,bottom,text-bottom,text-top}`
- **Misc**: `clearfix`, `stretched-link`, `bg-transparent`, `pe-none`

---

## Optional: Tomaco MCP for live class/prop validation

The design-system team ships a separate `tomaco-mcp-server` (14 tools:
`get_utility_classes`, `get_component_info`, `validate_props`,
`get_theming_info`, `get_changelog`, etc. — see the Storybook's "AI Setup"
page for the full list and `.vscode/mcp.json` setup). It is **not** assumed to
be configured in every project — `mcp.example.json` in this harness only wires
up Figma by default, with Tomaco MCP shown as a commented/optional entry.

If it's configured in your workspace, prefer it over this file for anything
version-sensitive (a project on a different `tomaco-components` patch than the
one this file was audited against, or an ambiguous class where the compiled
`tomaco-ui.css` is the only real answer). If it isn't configured, this file and
`.github/instructions/tomaco-component-gotchas.md` remain the primary
reference — do not tell a human you queried a tool that isn't there.
