---
name: new-step
description: Create a new frontend step or route for a Falabella Seguros flow. Use when the user asks for a new journey step, page step, or flow stage.
argument-hint: "[StepName] [country]"
---

# New step

## Before editing

1. Read `docs/homero/business.md`
2. Read `docs/homero/architecture.md`
3. Confirm the step objective, country, APIs, Figma source, and completion criteria

## Procedure

1. Create or update the route under `src/app/`
2. Decide whether the step needs a dedicated form, store, server action, or all three
3. If the step contains data capture, use the `new-form` skill or the local form generator
4. Keep orchestration in the route layer and field logic in the form layer
5. Validate empty, error, and success states

## Do not do

- Do not bury all logic inside `page.tsx`
- Do not invent API shapes without a verified contract
- Do not close the task without verification
