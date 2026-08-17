# Changelog

Homero doesn't publish to a registry, so this file exists for one reason:
explaining version boundaries that change `homero upgrade`'s behavior, not a
full history of every change. Run `homero version --target .` to see what
your install is actually on.

## 0.7.0

- **Fix: `homero discover` no longer silently locks every repo to pnpm.**
  `homero.config.json`'s `packageManager` and default `commands.lint`/
  `typecheck`/`test`/`e2e` shipped pnpm-flavored from the init template, and
  `discover` had no field to change `packageManager` at all — even
  `--packageManager` was silently discarded by `discoveredConfig()`. An
  npm or yarn repo got `homero setup playwright` hard-rejecting it
  ("currently supports repositories configured with pnpm") with no way to
  fix it short of hand-editing `homero.config.json`. `discover` now detects
  the real package manager from the repo's lockfile
  (`pnpm-lock.yaml`/`yarn.lock`/`package-lock.json`) before falling back to
  pnpm, records it as a real `packageManager` discovery field, and derives
  npm/yarn/pnpm-flavored command defaults accordingly. `homero setup
  playwright` now installs and configures Playwright for whichever package
  manager the repo actually uses. Only affects new `discover` runs — an
  already-discovered repo's recorded values are untouched by `upgrade`.

## 0.6.0

- **New required template files**: `.claude/commands/homero-review-plan.md`
  (Claude) and `.github/prompts/homero-review-plan.prompt.md` (Copilot) — an
  optional, non-gating command that starts a fresh session and delegates to
  `homero-reviewer` in a new "plan mode" to audit `spec.md`/`plan.md` for
  internal consistency before you approve them, without inheriting whatever
  context the planning conversation accumulated. `homero-reviewer` itself
  now documents two modes (plan / implementation) instead of one.

## 0.5.0

- **Breaking: the workflow now has a mandatory plan checkpoint.**
  Previously `homero-coordinator` went from a Figma URL straight through
  planning and implementation in one uninterrupted run
  (`docs/homero/ai-workflow.md` said so explicitly: "not a pause point
  between each"). That contradicted the actual design intent — a
  human-readable plan the human never gets a chance to read before code
  gets written from it isn't a review step, it's a formality. Constitution
  principle 9 and `ai-workflow.md` now require stopping once the plan
  passes `feature check`, before implementation starts, unless the human's
  own request already asked for uninterrupted end-to-end execution.
- **New required template files**: `.claude/commands/homero-plan.md` /
  `homero-implement.md` (Claude) and `.github/prompts/homero-plan.prompt.md`
  / `homero-implement.prompt.md` (Copilot) — `/homero-plan` always stops at
  the checkpoint; `/homero-implement` picks up an already-reviewed plan and
  drives it to completion; `/homero` still does both in one command but now
  pauses at the checkpoint by default too.

## 0.4.0

- **New required template files**: `.claude/skills/tomaco-design-system/references/css-utilities.md`
  (Claude) and `.github/instructions/tomaco-css-utilities.md` (Copilot). An
  already-installed repo will fail `homero validate` as "missing required
  file" until it runs `homero upgrade`.
- Tomaco design-system knowledge enriched from the design system's own
  upstream skill (`tomaco-components/.github/skills/tomaco-design-system/`,
  audited against v1.14.40) plus direct verification against the real
  `styles/*.sass` sources at v1.14.42: an exhaustive positive CSS
  utility-class/grid/color-token reference (previously Homero only had
  utility-class *traps*, not a positive catalog), and two Tomaco-specific
  grid overrides not documented anywhere before — containers capped at
  1152px past `lg` (don't grow further at `xl`/`xxl` like stock Bootstrap),
  and a 32px default `.row` gutter (not Bootstrap's 24px). Cross-checked and
  reconciled against the Figma-derived `Container.lg.SF` (1152px, confirmed)
  / `Container.lg.OMNI` (1120px, confirmed as a Figma-only variant, not a
  Tomaco grid class) figures already in `seguros-falabella-ui-ux`.
- `tomaco-design-system` evals expanded from 5 to 10, covering CSS
  class-family disambiguation (Tomaco-native vs Bootstrap-compatible
  breakpoints/spacing) and the optional Tomaco MCP validation path.
- `mcp.example.json` documents `tomaco-mcp-server` (a separate, real MCP
  server maintained by the design-system team, 14 live component/CSS/prop
  query tools) as an explicitly optional, disabled-by-default entry — Homero
  does not assume it's deployed for any given org.

## 0.3.0

- **Breaking: `runtime.maxVerifyAttempts` now defaults to 2, not 3**, on a
  fresh `homero init`. `upgrade` never rewrites a recorded config value, so
  an already-installed repo keeps whatever it has today — this only changes
  what new installs get. Raise it back to 3 (or any value) in
  `homero.config.json` if the old default was intentional.
- **Breaking: `plan.md` now has two new required sections** — "Tomaco
  components and tokens" and "Pixel-perfect styling" — and `homero feature
  check`/`run`/`verify` all now reject a plan that leaves any of its six
  required sections (those two plus Technical summary, Files to create or
  modify, Form and validation plan, Figma adaptation plan) as the shipped
  template's unedited placeholder (constitution.md principle 18). A feature
  already in flight whose `plan.md` predates this version will start failing
  its next `feature check`/`run`/`verify` until those sections are filled
  in — this is deliberate, not a regression: the plan previously had no gate
  requiring it say anything at all.
- Claude's `rules/server-actions.md` and `rules/transport-patterns.md` had
  drifted into two overlapping, inconsistent descriptions of the same
  `server-actions` pattern. Split cleanly by scope again, matching the
  Copilot adapter's `server-actions.instructions.md` /
  `transport.instructions.md` split. Added `rules/frontend.md` (Claude) to
  close the remaining gap with Copilot's `frontend.instructions.md`.
- `scripts/self-test.mjs` now runs a structural Claude/Copilot adapter
  parity check (every rule/skill/agent/prompt topic must exist on both
  sides) as part of `homero`'s own CI, not just as a manual-authoring
  convention.

## 0.2.0

- **Breaking: `homero.config.json` now records `homeroClient`** (`claude`,
  `copilot`, or `both`) — the adapter(s) a repo was installed with.
  `validate`/`upgrade` read it to know which files should exist, instead of
  guessing `both` and reporting a pile of false "missing file" errors on a
  single-adapter install.
- A repo installed before this field existed (0.1.x) has no way to be
  guessed safely: `upgrade` **refuses to run** on it instead of assuming
  `both`, because that would install an entire second adapter's worth of
  files as untracked additions a plain `git checkout .` can't undo. Pass
  `--client copilot|claude|both` once — matching whichever adapter(s) the
  repo actually has — and it's recorded for good; every `upgrade` after that
  is unaffected.

## 0.1.x

Predates `homeroClient`. `upgrade` will not run against a repo still on this
line — see the entry above.
