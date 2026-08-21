---
applyTo: "**/*.{ts,tsx,css,scss}"
---

# Homero Seguros Falabella UI/UX Rules

Companion to `.github/instructions/tomaco-design-system.instructions.md`: this file
is WHY/WHERE (layout, hierarchy, spacing, responsive structure, pattern reuse from
the Seguros Falabella foundations and component library); that one is WHAT (exact
Tomaco component/prop/class/token). Do not repeat exact prop names, component
inventories, or utility-class tables here — switch to
`tomaco-design-system.instructions.md` the moment a decision needs a real API
instead of a layout/hierarchy judgment call.

## Never do this

- Invent a new visual system if a known Seguros pattern already fits.
- Use product accent colors as the default text hierarchy.
- Infer exact Tomaco props or utility classes from visual patterns alone.
- Mix required consent, optional consent, validation, and navigation into one
  undifferentiated block.

## Working rules

1. Reuse existing foundations first, existing component patterns second, before
   proposing anything custom.
2. Use product colors for emphasis and product identity, not as uncontrolled
   interactive color.
3. Keep text hierarchy, spacing rhythm, and grid behavior consistent across
   desktop and mobile.
4. Prefer accessible, low-friction flows: clear grouping, clear labels, visible
   feedback, restrained decoration.

## Containers, spacing, and grid defaults

Use these unless the task clearly requires a documented variant.

- **Mobile**: `375px` viewport baseline, `24px` side padding
  (`Container.sm.SF`, inner content example `327px`).
- **Desktop**: `1280px` viewport baseline, `1152px` max content container,
  `64px` side margins (`Container.lg.SF`). A recurring split inside it is
  `~757px` main content + `~363px` summary. **Code cross-check**: `1152px` is
  the real, verified `max-width` of Tomaco's `container`/`container-lg`/
  `container-xl`/`container-xxl` classes (`styles/grid.sass` caps the
  container at `lg`'s width instead of growing further at `xl`/`xxl`, unlike
  stock Bootstrap) — see `.github/instructions/tomaco-css-utilities.md` → Grid
  system. Figma and code agree here.
- **Desktop OMNI variant**: `1440px` viewport, `1120px` max content
  (`Container.lg.OMNI`), split example `~736px` / `~352px`. **Code
  cross-check**: `1120px` does **not** come from Tomaco's shared `container`
  classes (those only ever resolve to `1152px`) — `Container.lg.OMNI` is a
  Figma-file-specific variant, not a Tomaco library grid class. Confirm with
  the design source before assuming `className="container"` alone produces
  `1120px`.
- **Spacing scale** (doubling rhythm): `4`, `8`, `16`, `32`, `64`. Avoid
  one-off values (`20`, `22`, `26`, `30`) unless an existing component already
  imposes them.
  - `8px` tight inline spacing (label-to-input, compact card content).
  - `16px` related-content spacing.
  - `24px` standard boxed-surface padding (cards, summaries) and mobile side
    padding — do not treat these as unrelated numbers, they're the same
    system value used in two places.
  - `32px` between clearly separate blocks / larger grouped-surface padding.
  - `40px`–`56px` section bands between major layout regions.
- **Grid**: mobile defaults to one column (two-up only for short peer
  elements like small cards or paired fields); desktop prefers one primary
  content column plus an optional secondary support column over many equal
  columns. Three-up card layouts are fine on desktop if every card keeps
  consistent height, spacing, and action alignment.
- **Forms/summaries**: group related fields in blocks, not one long list; one
  clear primary action area at the bottom of the main task zone; summary
  panels support the task and stack below or collapse on mobile, never
  dominate.
- **Text/color**: default body copy stays in neutral text colors; product
  colors are accents/identifiers/emphasis, never long text passages; borders
  and separators stay light and quiet.

## Foundations reference

### Color

Neutral hierarchy (hex values are Figma-derived — **the CSS custom properties
Tomaco emits on `:root` are the authoritative source in code**, e.g.
`var(--neutral5)`, not a pasted literal):

- `Neutral 0` `#FFFFFF` white base · `Neutral 5` `#F5F7F9` very light
  backgrounds · `Neutral 10` `#E4E9EE` decorative emphasis/strokes/dividers ·
  `Neutral 20` `#C3CDD8` stronger decorative background · `Neutral 40`
  `#90979E` tertiary text · `Neutral 60` `#5E6267` secondary text ·
  `Neutral 80` `#333537` primary text · `Neutral 85` `#292A2C` and
  `Neutral 95` `#151616` darker emphasis/deep contrast.

Product palettes (accent/identity only, not a substitute for neutral text
hierarchy or arbitrary CTA states): Movilidad = Blueberry, Vida = Raspberry,
Salud = Orange, Hogar = Grape, Viajes = Agave (each with a 50/60, 10, and 5
shade). Preserve WCAG contrast — don't trade readability for brand saturation.

### Typography

- Font family: confirmed in production Falabella Seguros code as **Maven Pro**, loaded via `next/font/local` in a Next.js project. If the repo already loads a font this way, reuse it — do not introduce a second font-loading mechanism alongside an existing `next/font` setup.
- Titles (`h1`/`h2`-equivalent): `title.md` 32/28.
- Section headings: `heading.lg` 22, `heading.md` 18, `heading.section` 12.
- Paragraphs: `paragraph.lg` 20, `paragraph.md` 18, `paragraph.sm` 16.
- Labels: primary/secondary variants across `lg`/`md`/`sm`/`xs`.
- Input values: `input.value.md` 20.

Use typography to express hierarchy before reaching for color, borders, or
decoration.

### Elevation

- `Flat`/`Base`: informative surfaces, low-emphasis cards — the calm default.
- `Shadow 100`: fixed components needing separation from surrounding content.
- `Shadow 100 invert`: fixed components with bottom-attached/inverse shadow
  direction.
- `Shadow 400`: reserved for modals/dialogs only — don't invent a custom
  depth for an overlay, and don't use modal elevation for something that
  isn't truly acting like one.
- Don't stack multiple heavy shadows in one viewport; a summary panel, a
  card, and a modal should not all compete at the same shadow intensity.

## Known cross-product patterns

Patterns confirmed against real, UI/UX-approved Falabella Seguros products (Salud, Vida) — check here before treating something as a fresh unknown that needs a from-scratch question to the human.

- **Page composition** (general — applies to any screen with page chrome): real Falabella Seguros screens compose in this layer order: a shared chrome molecule (`Header`/`Layout`, imported explicitly per screen — see `docs/homero/architecture.md`'s "App shell" section) wraps a content container, which splits into a primary content column (form) and an optional secondary support column (summary) on desktop, stacking on mobile. Name this composition explicitly instead of describing it generically — it confirms both which files already provide chrome and which split ratio applies (`757/363` standard, `736/352` OMNI variant).
- **"¿Estoy recibiendo ayuda de un asesor?" switch** (scoped — sales/quote flow only, do not assume it appears on servicing/post-sale screens): a recurring interaction, confirmed identical in two independent products (Vida, Salud): a switch that, when turned on, reveals a required "Código del asesor" text input (max 8 characters) with a tooltip explaining who provides the code, validated like any other required field, and cleared when the switch is turned back off. When this exact switch appears in a quote/onboarding flow, treat this as the confirmed default behavior and present it to the human as "detected known pattern: X — confirm, or tell me if this instance differs" instead of asking what it does from zero. Still confirm — Figma may have intentionally deviated — the question is now a confirmation, not a blank one. This is specific to the sales/quoting phase; do not assume an "advisor" switch on a different kind of screen means the same thing without checking.
- **Layout wrapper class** (real citation, generalize the shape not the literal class): the shared chrome/`Layout` molecule confirmed above constrains width and padding with real classes, not a Tomaco container prop: `container-fluid d-flex flex-column align-items-center justify-content-center max-width-1152`, plus **conditional** side padding (`pl24 pr24` mobile vs `pl64 pr64` desktop) and **conditional** bottom padding depending on whether that step shows a summary sidebar on mobile. Check whether the repo's own `Layout` already varies padding by viewport and by "has summary" before hardcoding one flat value.
- **Which routes get a summary is a Layout-level decision, not a per-page one**: the shared `Layout` molecule holds a path allowlist (which routes render the summary sidebar) and derives it from the current route — individual step/page components do not decide this themselves. When adding a new step to an existing flow, extend that shared allowlist/mapping instead of having the new step render its own summary logic — same principle as the step-to-section mapping rule in `step-widgets.instructions.md`, applied one level up (route-to-layout, not just step-to-section).
- **Breakpoint source ambiguity** — verify before trusting `col-md-*`/`col-lg-*` classes: a real production repo mixes a JS-side mobile check (`useMediaQuery('(max-width: 767px)')`) with Bootstrap-named grid classes in the same layout. Because Tomaco's stylesheet loads its helpers after a Bootstrap-like grid and several class names collide at the same specificity (see `tomaco.md`'s "Utility-class traps"), which stylesheet actually governs a given column class at runtime cannot be assumed from the class name alone — check the built CSS or `tomaco-design-system`'s grid reference first.

## Component catalog (Figma "❖ Components")

Map the task to the closest existing page before creating anything custom;
compose existing building blocks before proposing a new artifact. Families in
the library: Accordion, Alerts, Buttons (+ Link variants), Badges,
Breadcrumbs, Banners/campañas, Cards (simple + comparación), Checkout, Capcha,
Modals, Feedback, Form, Filter, Footer, Header, List, Item, Loader, Summary,
Switch, Tooltips, Table, Tabs, Templates pages, Template PDF, Templates
Emails, plus Logos and Icons/Illustrations asset families. If a task falls
into email/PDF templates specifically, treat it as a different medium — don't
copy web interaction patterns blindly (see "Routing by task shape" below).

Concrete patterns worth knowing before you guess dimensions:

- **Simple cards**: image-first, tag + title + optional paragraph + CTA,
  observed width `242px`. For promotional/informational/entry-point cards.
- **Comparison cards**: a *separate* pattern from simple cards, not a
  restyle — `default`/`destacada` states, fixed width `276px`, plan name +
  coverage list + check iconography. Only for side-by-side plan/product
  evaluation.
- **Checkout desktop (OMNI variant)**: uses `Container.lg.OMNI` (`1120px`
  max content), `736px` main task area + `352px` summary column — not the
  standard `Container.lg.SF` `757px` / `363px` split. Summary stays visible
  as support and must not overtake the decision flow.
- **Accordion**: compact header row, left-aligned title + right-aligned
  trigger icon, `24px` horizontal inner padding. For benefit lists, policy
  details, expandable summaries.
- **Alerts**: live inside a card/content container (never floating bare on
  the page), typically above the affected field group. Don't scatter
  multiple competing alerts in one viewport without grouping/hierarchy.

Routing by task shape:

- **Form flow** → `Form`, `Checkout`, `Summary`, `Header`, `Feedback` pages;
  load the form-patterns rules below for field states, consent, radio/
  checkbox composition, or inline validation. Typical structure: main form
  content primary/left column, summary/recap on the right (desktop),
  primary+secondary actions grouped in a footer, alerts inside the form
  surface above the affected field group.
- **Informational/promotional** → `Banners y campañas`, `Cards`, `Feedback`,
  `Alerts`, `Tooltips`. Simple cards for editorial/promo; comparison cards
  only for structured evaluation.
- **Dense/data-oriented** → `Table`, `List`, `Item`, `Tabs`, `Filter`.
- **Container/overlay** → `Modals`, `Accordion`, `Summary`, `Footer` — use the
  elevation rules above to decide flat vs. fixed vs. true-dialog treatment.

If a task falls into email/PDF templates, treat it as a different medium —
don't copy web interaction patterns blindly.

## Form and selection patterns

Structural/behavioral only — for exact component names (`Input`, `TextArea`,
`CheckBox`, `RadioButton`, `Select`, `InputDate`, `Upload`, `Alert`,
`Summary`, ...) switch to `tomaco-design-system.instructions.md`.

- **Field stack**: one clean column unless paired inputs are clearly one
  decision block; common single-column field width `~464px` inside a
  `544px` container; stable vertical rhythm, not manual one-off gaps.
- **Text input/textarea**: validation lives next to the affected field, never
  a distant global message; disabled inputs stay readable enough to preserve
  context; textareas are for genuinely open-ended input, not a stand-in for a
  missing structured field.
- **File input**: must clearly communicate idle/loading/success/error — an
  async upload's loading state must not look like a frozen screen; keep it
  near the text/checklist explaining why the document is needed.
- **Date input**: use a real date control, never free text; avoid ambiguous
  date formatting in labels/placeholders.
- **Placeholder/masking**: placeholder text clarifies expected input, it does
  not duplicate the label and it is never the only field descriptor;
  sensitive values shown back to the user (summaries, lists, recaps) follow a
  masking rule.
- **Checkboxes**: required legal acceptance must be visually and
  semantically separate from optional marketing/lead-capture consent —
  optional consent never competes visually with the primary action.
  Multi-select checkboxes are for options that can coexist, not mutually
  exclusive decisions. Country-specific opt-in flow: lead-capture consent
  early in the quote flow; terms/conditions acceptance mandatory before
  contracting (checkout, user data, or DPS step); optional consent may live
  in checkout/user-data steps but must stay clearly optional.
- **Radio buttons**: only for mutually exclusive choices. Add a subtitle/
  descriptive row when the consequence of a choice isn't obvious. Full-row
  selectable cards (whole card clickable) are for decisions important enough
  to deserve more context. Reveal follow-up questions progressively under the
  selected choice, don't front-load every option.
- **Alerts in forms**: inline, above/near the affected field group; never
  replace field-level validation with a distant summary-only warning; if the
  alert affects the next action, keep it in the same scan zone as the field
  and the action.
- **Summary/fixed actions**: support content, not the main reading path.
  Persistent on desktop when it aids decision confidence; condensed on
  mobile, protected from burying the primary task. Fixed action bars stay
  stable and predictable across steps.

## Validation copy conventions

Real, in-production Falabella Seguros error copy (confirmed across two products) follows a consistent register — short, direct, "Debes..."-pattern for required/format errors:

- "Debes ingresar un/una `<campo>` válido/a" (RUT, correo, teléfono, fecha)
- "Este campo es requerido"
- "RUT inválido"
- "Debes aceptar los términos y condiciones"
- Field-specific format hints when a regex constrains the value (e.g. a phone field: "El número debe comenzar con 9 seguido de 8 dígitos")

Treat these as a reference for *style*, not a substitute for the real copy: always source the exact error copy for a given field from Figma (an error/invalid-state variant) or the human first. Use this register only to sanity-check found copy, or as a starting point when Figma genuinely has no error copy and the human confirms generic copy is acceptable for that field.

## Review/proposal checklist

Before treating a screen proposal or review as done:

1. It clearly reuses a known foundation and component pattern (state which).
2. Text hierarchy matches the foundation scale.
3. Color usage respects semantic intent — no decorative palette used for a
   critical interaction state.
4. Spacing follows the system rhythm, not arbitrary values.
5. Mobile and desktop both have an intentional structure, not just a shrunk
   desktop layout.
6. There's a clear primary action and readable content grouping.
7. If implementation is next, exact component props/classes are validated
   through `tomaco-design-system.instructions.md` or the installed package —
   not assumed from this file.
