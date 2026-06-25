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
2. Identify the Tomaco atoms and project layout primitives first
3. Translate design intent into project code style
4. Do not copy raw Tailwind classes into a non-Tailwind repo
5. Clarify missing behavior instead of guessing it from visuals alone
6. Verify the final result against the design and the product context

## Output expectations

- Tomaco-aligned UI
- Minimal custom CSS
- Clear notes when design intent was ambiguous
