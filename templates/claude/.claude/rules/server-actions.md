# Server action rule

Apply this rule whenever editing server-side transport or mutation code.

## Required conventions

- Keep sensitive transport details on the server boundary
- Prefer a params object over many positional arguments
- Keep request and response typing explicit
- Do not leak secrets or internal URLs into the client bundle

## Validation

- The caller shape is clear
- Error handling is explicit
- Logging is sanitized
