---
applyTo: "**/{proxy,middleware}.{ts,tsx}"
---

# Homero Transport/Proxy Rules

- Keep this file self-contained — do not import application modules into it.
- Use it only for cross-cutting concerns: route/step gating, trace-id propagation, cookie management, redirects.
- Do not put business or form validation logic here; that belongs in server actions or the service layer.
- Record the chosen transport pattern (`server-actions` vs `proxy-middleware`) in `homero.config.json` under `transport.pattern`.
