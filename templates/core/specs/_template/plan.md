# Feature plan: <feature-name>

## Delivery boundary

- Feature ID: __FEATURE_ID__
- Figma source: __FIGMA_URL__
- Figma approved version: __FIGMA_VERSION__
- Required design system: Tomaco

## Technical summary

-

## Repo patterns to reuse

Before naming a new file under `paths.widgetsRoot` or proposing a new shared
component, search existing features and that path for one that already
covers the need (see `docs/homero/architecture.md` and, if installed,
`graphify query` — `docs/homero/knowledge-graph.md`). List what you found
below; reuse or extend it, and only propose a new file if nothing matches.

-

## Tomaco components and tokens

For every screen or section this feature touches: the exact Tomaco
component name (confirmed against the installed `tomaco-components`
package, the generated catalog, or a Figma Code Connect mapping — never a
guess, per principle 11/16 in `docs/homero/constitution.md`), the props it
needs, and which design tokens (spacing, color, typography) back it. A
component you could not confirm does not go here — it goes under Open
questions in the spec.

-

## Pixel-perfect styling

For every screen and breakpoint (desktop, mobile — see `design.viewports`
in `feature.json`): exact paddings, margins, gaps, and layout (grid/flex
structure), expressed as Tomaco spacing tokens or utility classes, not raw
pixel values copied from Figma. Anything Figma shows that Tomaco has no
token for is an open question, not an invented value.

-

## Files to create or modify

-

## Data and state flow

-

## Backend contract and mocks plan

- Contract source:
- Contract confidence: final | draft | missing
- Mock strategy: fixtures | msw | service-layer-stub | custom
- Mock location:
- Payload assumptions to confirm with backend:

## Form and validation plan

-

## Figma adaptation plan

-

## Risks

-

## Verification plan

- lint:
- typecheck:
- test:
- e2e:
- visual/design check: desktop and mobile against approved baselines
- Playwright CLI scenarios and evidence paths:
