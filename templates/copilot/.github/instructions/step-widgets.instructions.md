---
applyTo: "**/widgets/**/*.{ts,tsx}"
---

# Homero Step Widget Rules

- Before creating a new shared widget file, search `paths.widgetsRoot` (and prior features under `features/`) for one that already covers the need — reuse or extend it instead of adding a duplicate.
- Put cross-step layout and summary widgets under the path recorded in `homero.config.json` `paths.widgetsRoot`.
- A shared widget must not read state stores directly — each step screen reads its own store and passes primitives (title, price, etc.) as props into the widget — **except the flow-spanning chrome widgets that get imported once into every step: `Header` (multi-country step/progress indicator) and `Summary` (multi-country recap/sidebar).** These two may read shared stores directly. This is a confirmed, repeated real convention (verified independently in both widgets in production Falabella Seguros code), not an invented default: passing the full aggregated, per-country state through props at every step's call site is more boilerplate than the coupling it avoids, and multi-country variance makes that worse, not better. Do not extend this exception to a new widget just because it's convenient — it applies to `Header`/`Summary` specifically, not to "shared widgets" as a category. A smaller, composable shared widget (a reusable card, a status badge) still takes props.
- Extend the existing step-to-section mapping when a new step needs a summary section, instead of inventing a parallel step enum.
- Reuse one shared two-column step layout for steps that need an order/progress summary; don't force it on steps that don't need one.

## Reject

- A step screen reading another step's store directly.
- A new step enum introduced only to key a summary section.
- Duplicated header/content/summary markup across steps that all need the
  same header/content/summary shape.
