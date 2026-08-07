---
applyTo: "**/{proxy,middleware}.{ts,tsx}"
---

# Homero Transport/Proxy Rules

This repo family supports two valid write-transport patterns. Check
`homero.config.json` `transport.pattern` before assuming which one applies —
this file covers `proxy-middleware`; see
`.github/instructions/server-actions.instructions.md` for the `server-actions`
pattern.

## proxy-middleware

- Keep this file self-contained — do not import application modules into it.
- Use it only for cross-cutting concerns: route/step gating, trace-id
  propagation, cookie management, redirects.
- Do not put business or form validation logic here; that belongs in server
  actions or the service layer.
- Record the chosen transport pattern (`server-actions` vs `proxy-middleware`)
  in `homero.config.json` under `transport.pattern`.

## Reject

- Mixing both patterns for the same concern without recording the decision in
  `homero.config.json`.
- Business or form validation logic inside a proxy/middleware file.
