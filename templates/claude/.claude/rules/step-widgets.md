# Shared step widgets rule

Apply this rule whenever editing a multi-step flow's layout or a shared
summary/sidebar widget.

## Required conventions

- Before creating a new shared widget file, search `paths.widgetsRoot` (and
  prior features under `features/`) for one that already covers the need —
  reuse or extend it instead of adding a duplicate
- Put cross-step layout and summary widgets under the path recorded in
  `homero.config.json` `paths.widgetsRoot` (default `src/widgets`)
- A shared summary widget must not read state stores directly; each step
  screen reads its own store and passes primitives (title, price, etc.) as
  props into the summary
- When a new step should contribute a section to a shared summary, extend
  the existing step-to-section mapping instead of introducing a parallel
  step enum
- Reuse one shared two-column step layout (header + main content + optional
  summary aside) for steps that need an order/progress summary; steps that
  don't need one should not force this layout

## Reject

- A step screen reading another step's store directly
- A new step enum introduced only to key a summary section
- Duplicated layout markup across steps that all need the same
  header/content/summary shape
