# Knowledge graph procedure (graphify)

Use graphify to explore unfamiliar or large parts of the codebase by querying a
graph instead of reading files one by one. This is a productivity and token-cost
control, not a feature deliverable — it is never checked by `homero validate` or
`homero feature check`, but using it is required by
`docs/homero/constitution.md`.

Code extraction runs fully local (AST via tree-sitter, no API key, no cost). Only
semantic extraction over docs/PDFs/images optionally calls an LLM, and this repo's
codebase-scoped graph should stay code-only.

## Preconditions

1. Confirm graphify is available with `graphify --version`. If it is unavailable,
   ask the user to run `node scripts/homero/homero.mjs setup graphify --target .`;
   do not install global tools silently.
2. The graphed target is the path recorded in `homero.config.json`
   `graphify.target` (default `src`) — the product source code, not
   `docs/homero/`, `specs/`, or `features/`. Those are small enough to read
   directly; graphify's token savings show up on large, unfamiliar code, not on a
   handful of markdown files.

## Required flow

Build or refresh the graph before exploring, then query instead of reading files
broadly:

```text
graphify <graphify.target> --update
graphify query "<question about the code>"
```

Use `graphify path "<A>" "<B>"` to trace how two modules/components connect, and
`graphify explain "<Node>"` for a plain-language summary of one node. Prefer these
over `Grep`/`Read` sweeps across many files when the question is about
relationships or unfamiliar structure, not a known exact location.

## Example queries

- `graphify query "widgets or components similar to a step header/summary"`
  — before adding a new shared widget, check whether a prior feature already
  built one (required by `docs/homero/constitution.md` principle 15).
- `graphify query "where is the RUT/DNI validation logic used"`
- `graphify explain "OrderSummaryWidget"`
- `graphify path "CheckoutStep" "OrderSummaryWidget"`

## When not to use it

- The target file(s) are already known (a specific component, a specific test) —
  just read them directly.
- The task is a small, localized change where exploration isn't needed.
- `graphify.target` has no graph yet and the task is trivial enough that building
  one first would cost more than it saves — still prefer `--update` first if the
  task touches unfamiliar code.

## Completion

Do not commit `graphify-out/` — it is a derived, regenerable index and is listed
in `.gitignore`. If graphify surfaced something that changed your implementation
approach, note it in the task summary (`homero task verify --summary`), but the
graph itself is never part of the feature's evidence.
