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

## Gotcha

- Any file that imports from `tomaco-components` needs `'use client'` at the
  top, even if the file itself uses no hooks — the package's bundle may call
  `createContext` without declaring a client boundary, which breaks Server
  Component builds otherwise
