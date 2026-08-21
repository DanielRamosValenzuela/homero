<!-- homero:managed — maintained by `homero upgrade`. Delete this line to take ownership;
     upgrade will then leave it alone and write its version to CLAUDE.md.homero-new. -->

Read `AGENTS.md` first.

Then use the local Homero contract:

- `docs/homero/business.md`
- `docs/homero/architecture.md`
- `docs/homero/conventions.md`
- `docs/homero/verification.md`

Prefer:

1. the core Homero docs for product and frontend context
2. client-specific rules for always-on constraints — read the one(s) matching what you're
   about to touch, each names exactly when it applies: `.claude/rules/frontend.md` (any
   UI/style/component file), `.claude/rules/tomaco.md` (React UI components), `.claude/rules/forms.md`
   (forms under `src/ui/`), `.claude/rules/step-widgets.md` (multi-step flow layout or shared
   widgets), `.claude/rules/server-actions.md` (server actions) or `.claude/rules/transport-patterns.md`
   (proxy/middleware) — check `homero.config.json`'s `transport.pattern` first to know which
   of those last two applies
3. optional skills for reusable procedures
4. `scripts/homero/new-form.mjs` for repeated 4-file form scaffolds
