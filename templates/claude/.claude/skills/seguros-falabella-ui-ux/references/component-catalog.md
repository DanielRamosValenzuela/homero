# Component Catalog

This catalog is derived from the `❖ Components` portion of the Seguros UI Tomaco Web Figma file.

Detected component and template areas:

- `↳ Accordion`
- `↳ Alerts`
- `↳ Buttons`
- `↳ Budges`
- `↳ Breadcrumbs`
- `↳ Banners y campañas`
- `↳ Cards`
- `↳ Checkout`
- `↳ Capcha`
- `↳ Modals`
- `↳ Feedback`
- `↳ Form`
- `↳ Filter`
- `↳ Footer`
- `↳ Header`
- `↳ List`
- `↳ Item`
- `↳ Loader`
- `↳ Summary`
- `↳ Swich`
- `↳ Tooltips`
- `↳ Table`
- `↳ Tabs`
- `↳ Templates pages`
- `↳ Template PDF`
- `↳ Templates Emails`

Additional inspected patterns from the design source:

- `Dropdown / Accordion`
- `Alerts`
- `Components Buttons`
- `🟢 Link` variants on light and dark backgrounds
- `Cards simple base`
- `Cards de comparación`
- `Desktop happy path` checkout

Additional asset families detected in the same file:

- `♠ Logos`
- `↳ Logos Seguros`
- `↳ Logos métodos de pago & otros`
- `♠ Icons & Illustraciones`
- `↳ Icons`
- `↳ Illustrations`

## How To Use This Catalog

## Concrete patterns captured from the library

### Accordion / dropdown

- The accordion pattern uses a compact header row with left-aligned title content and a right-aligned icon trigger.
- Closed rows appear in fixed-height bands; expanded rows reveal structured content blocks below.
- Common inner padding observed in the rows is `24px` horizontally.
- Use this pattern for benefit lists, policy details, expandable summaries, or grouped optional information.

### Alerts

- Alerts are shown inside a visible card or content container, not floating directly on the page with no support surface.
- The examples explicitly place inline messages above form fields to preserve visibility and contrast.
- Use alerts to clarify state, warnings, or context inside a task flow, especially forms.
- Do not scatter multiple competing alerts across the same viewport without grouping or hierarchy.

### Buttons and links

- The button source is rich enough to derive consistent rules for size, state, icon placement, loading state, and light/dark appearance.
- The links source complements this with `primary` and `secondary` link behavior, `default`, `hover`, and `active` states, plus `expand`, `collapse`, and `external` targets.
- This is sufficient to keep the skill opinionated about action hierarchy: one clear primary action, supporting secondary actions, and links for lightweight navigation or disclosure.

### Simple cards

- The simple base card pattern shows image-first cards with tag area, title, optional paragraph, and a CTA button.
- The observed card width is `242px` in the repeated desktop examples.
- This pattern is appropriate for promotional, informational, or entry-point cards where visual parity matters more than dense comparison.

### Comparison cards

- Comparison cards are a separate pattern, not just a restyled simple card.
- The source explicitly describes two states: `default` and `destacada`.
- The observed fixed width is `276px`.
- Anatomy includes plan name, coverage list, and iconography/check support.
- Use this pattern only when the user needs side-by-side evaluation between plans or products.

### Checkout desktop happy path

- The checkout pattern confirms a clear desktop split: `736px` main task area with a `352px` summary support column.
- The main flow stacks selectable payment cards, headings, promo markers, and a bottom action button.
- The summary stays visible as secondary support and should not overtake the decision flow.
- This is a strong reference for any task involving step-based selection plus recap.

### If the task is a form flow

Prefer existing pages such as:

- `Form`
- `Checkout`
- `Summary`
- `Header`
- `Feedback`

Also load [./form-patterns.md](./form-patterns.md) when the task depends on field states, consent blocks, radio/checkbox composition, inline validation, or summary behavior in a contracting flow.

Common structure observed in the grid examples:

- Main form content on the left or primary column.
- Summary or recap on the right for desktop.
- Primary and secondary actions grouped in a footer area.
- Alerts live inside the form surface or card, usually above the affected field group.
- Accordions can be used to collapse benefits, conditions, or secondary explanatory blocks without breaking the main progression.

### If the task is informational or promotional

Prefer existing pages such as:

- `Banners y campañas`
- `Cards`
- `Feedback`
- `Alerts`
- `Tooltips`

Prefer `Cards simple base` for editorial or promotional cards and `Cards de comparación` only for structured product evaluation.

### If the task is dense or data-oriented

Prefer existing pages such as:

- `Table`
- `List`
- `Item`
- `Tabs`
- `Filter`

### If the task is a container or overlay pattern

Prefer existing pages such as:

- `Modals`
- `Accordion`
- `Summary`
- `Footer`

Use the elevation guidance from `foundation-summary.md` to decide whether the surface should stay flat, become fixed, or behave like a true dialog.

## Decision Rules

1. Map the task to the closest existing page before creating anything custom.
2. If two pages are relevant, compose them rather than mixing unrelated visual rules.
3. Prefer the most conservative extension of an existing pattern.
4. Keep the same typography, spacing, border, and color semantics already used by adjacent patterns.
5. If a task falls into templates or email/PDF output, treat it as a different medium and avoid copying web interaction patterns blindly.
6. If the task compares products, use the dedicated comparison-card logic instead of adapting a generic promo card.
7. If the task requires stacked decisions plus recap, default to the checkout pattern before inventing a new two-column structure.