---
applyTo: "**/*.{ts,tsx}"
---

# Homero Server Action Rules

- Keep Server Actions thin and typed.
- Validate incoming payloads before calling service or API layers.
- Do not expose secrets, raw credentials, or sensitive payloads in logs.
- Reuse the project's existing service layer and error handling patterns.
- Keep client components from importing server-only modules directly.