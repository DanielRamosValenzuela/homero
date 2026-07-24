# Frontend architecture

## Default stack

- Next.js App Router
- React + TypeScript strict mode
- Tomaco as the primary design system
- React Hook Form + Zod for forms
- TanStack Query for read-side client data
- Server Actions or server-side transport for writes
- Zustand for cross-step client state when needed

## Frontend boundaries

### UI

- UI lives under `src/ui/`
- UI lives under `src/ui/{country}/` when behavior varies by country. Only copy, validation messages, and business rules should vary per country — keep the shared shell and logic reusable across countries
- If a form or view does not vary in structure between countries (only in
  data, e.g. payment methods), keep a single implementation under
  `src/ui/global/{Name}` instead of forking it into per-country copies
- Repeated form patterns should keep `schema.ts`, `use*.ts`, and `index.tsx` together

### Routing and steps

- Step routes live under `src/app/`
- A step owns orchestration, not all field logic
- Form logic should stay close to the form itself

### Shared step widgets

- Before adding a new shared widget, search `paths.widgetsRoot` (and prior
  features under `features/`) for one that already covers the need — reuse
  or extend it instead of duplicating
- Cross-step layout and summary widgets live under `src/widgets/` (or the
  path recorded in `homero.config.json` `paths.widgetsRoot`)
- A shared order-summary or step-summary widget should not read state stores
  directly; each screen reads its own store and passes primitives as props
- Prefer one shared two-column step layout (header + content + optional
  summary aside) over duplicating layout per step
- When a new step needs to appear in a shared summary, extend the existing
  step-to-section mapping instead of inventing a parallel step enum

### Data and transport

- Read flows may use TanStack Query when cache and retry matter
- Write flows should not leak backend details to the client layer
- Sensitive transport and logging belong on the server boundary
- Two write-transport patterns are valid; record the choice in
  `homero.config.json` under `transport.pattern`:
  1. **server-actions** — typed server actions/handlers under the configured
     `serverActionsRoot`
  2. **proxy-middleware** — a self-contained edge/proxy layer (route gating,
     trace-id propagation, cookies) that must not import application modules

## Figma to code

1. Read the design node or frame
2. Identify Tomaco atoms first
3. Translate layout intent to project-approved layout primitives
4. Use design tokens or approved CSS variables instead of ad-hoc values
5. Validate the final UI against the design and product intent

## What to reject

- Tailwind copied directly from MCP output without adaptation
- Generic wrappers around Tomaco with no real logic
- Form types duplicated manually when `z.infer` should be used
- Client-side code that should clearly belong to the server boundary

## Known gotchas

- Any file that imports from the design system package needs an explicit
  client boundary directive (e.g. `'use client'`), even if the file itself
  uses no hooks, when the package's bundle calls browser-only APIs like
  `createContext` without declaring one itself — this silently breaks
  Server Component builds otherwise
- Do not reintroduce an ambiguous or duplicate name for a concept that
  already has a resolved name in the repo (e.g. a country/form resolver) —
  check existing naming before adding a parallel abstraction
