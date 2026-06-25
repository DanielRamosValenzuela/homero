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
- Country-specific UI may live under `src/ui/{country}/`
- Repeated form patterns should keep `schema.ts`, `use*.ts`, and `index.tsx` together

### Routing and steps

- Step routes live under `src/app/`
- A step owns orchestration, not all field logic
- Form logic should stay close to the form itself

### Data and transport

- Read flows may use TanStack Query when cache and retry matter
- Write flows should not leak backend details to the client layer
- Sensitive transport and logging belong on the server boundary

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
