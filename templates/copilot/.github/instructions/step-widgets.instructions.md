---
applyTo: "**/widgets/**/*.{ts,tsx}"
---

# Homero Step Widget Rules

- Before creating a new shared widget file, search `paths.widgetsRoot` (and prior features under `features/`) for one that already covers the need — reuse or extend it instead of adding a duplicate.
- Put cross-step layout and summary widgets under the path recorded in `homero.config.json` `paths.widgetsRoot`.
- A shared summary widget must not read state stores directly; each step screen reads its own store and passes primitives as props.
- Extend the existing step-to-section mapping when a new step needs a summary section, instead of inventing a parallel step enum.
- Reuse one shared two-column step layout for steps that need an order/progress summary; don't force it on steps that don't need one.
