---
name: figma-to-component
description: Implement a UI artifact from Figma using Tomaco and project conventions. Use when given a Figma URL, node id, or a request to build UI from design.
argument-hint: "[Figma URL or node id] [ComponentName]"
---

# Figma to component

## Before editing

1. Read `docs/homero/architecture.md`
2. Read `docs/homero/conventions.md`
3. Read `.claude/rules/tomaco.md`
4. If Figma MCP is not configured, stop and ask for the missing access path

## Procedure

1. Fetch the specific frame or node, not the whole file
2. Invoke `seguros-falabella-ui-ux` first for pattern reuse, layout/hierarchy, spacing, grid, and responsive structure
3. Invoke `tomaco-design-system` for the exact component/prop/utility-class/token that implements that structure
4. Translate design intent into project code style
5. Do not copy raw Tailwind classes into a non-Tailwind repo
6. Clarify missing behavior instead of guessing it from visuals alone
7. Verify the final result against the design and the product context

## Output expectations

- Tomaco-aligned UI
- Minimal custom CSS
- Clear notes when design intent was ambiguous
