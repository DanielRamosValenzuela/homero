# Transport patterns rule

Apply this rule whenever editing write-side transport, route gating, or
edge/proxy logic.

This repo family supports two valid write-transport patterns. Check
`homero.config.json` `transport.pattern` before assuming which one applies.

## server-actions

- Keep server actions thin and typed
- Validate incoming payloads before calling service or API layers
- Do not expose secrets, raw credentials, or sensitive payloads in logs
- Keep client components from importing server-only modules directly

## proxy-middleware

- Keep the proxy/middleware file self-contained — do not import application
  modules into it
- Use it only for cross-cutting concerns: route/step gating, trace-id
  propagation, cookie management, redirects
- Do not put business or form validation logic in the proxy layer

## Reject

- Mixing both patterns for the same concern without recording the decision
  in `homero.config.json`
- Business logic inside a proxy/middleware file
- Untyped or unvalidated payloads in a server action
