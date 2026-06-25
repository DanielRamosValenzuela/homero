# Tomaco rule

Apply this rule whenever editing React UI components.

## Required conventions

- Import directly from `tomaco-components`
- Do not create trivial wrappers
- Prefer approved layout classes and tokens before custom CSS
- Translate design output to Tomaco, not the other way around

## Reject

- Raw Tailwind copied from MCP output without adaptation
- New component abstractions with no product-level reason
- Hardcoded styling when the design system already covers the need
