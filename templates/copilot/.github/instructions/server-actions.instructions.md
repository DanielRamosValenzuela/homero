---
applyTo: "**/actions/**/*.{ts,tsx}"
---

# Homero Server Action Rules

This repo family supports two valid write-transport patterns. Check
`homero.config.json` `transport.pattern` before assuming which one applies —
this file covers `server-actions`; see
`.github/instructions/transport.instructions.md` for the `proxy-middleware`
pattern.

## server-actions

- Keep Server Actions thin and typed.
- Validate incoming payloads before calling service or API layers.
- Do not expose secrets, raw credentials, or sensitive payloads in logs.
- Reuse the project's existing service layer and error handling patterns.
- Keep client components from importing server-only modules directly.

## Reject

- Mixing both patterns for the same concern without recording the decision in
  `homero.config.json`.
- Untyped or unvalidated payloads in a server action.
