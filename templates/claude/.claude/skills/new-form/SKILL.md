---
name: new-form
description: Create or complete a frontend form using the Homero pattern for Falabella Seguros. Use when the user asks for a new form, step form, or country-specific form.
argument-hint: "[FormName] [country]"
---

# New form

Use this skill when the request is to create a form or form-like step.

## Before editing

1. Read `docs/homero/business.md`
2. Read `docs/homero/architecture.md`
3. Read `docs/homero/conventions.md`
4. Read `.claude/rules/forms.md`
5. If discovery context is missing, ask before inventing business behavior

## Procedure

1. If the form structure does not exist, run:
   `node .\scripts\homero\new-form.mjs --name <FormName> --country <country>`
2. Replace scaffold placeholders with the real fields and validation rules
3. Use `z.infer<typeof schema>` for the form values type
4. Keep Tomaco integration direct and explicit
5. Add or complete the test file
6. Run the verification commands defined by the repo

## Output expectations

- The structure is consistent
- The schema is not generic boilerplate
- The implementation reflects the real product context
