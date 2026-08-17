# Changelog

Homero doesn't publish to a registry, so this file exists for one reason:
explaining version boundaries that change `homero upgrade`'s behavior, not a
full history of every change. Run `homero version --target .` to see what
your install is actually on.

## 0.11.0

- **Breaking: `homero feature create` no longer uses a git worktree.** It
  now runs `git checkout -b <branch>` in place — the same directory you're
  already in — instead of creating a separate sibling directory. Deliberate
  trade-off: `specs/<id>/plan.md` is now immediately visible in the editor
  you already have open (previously it was tucked away in
  `../.homero-worktrees/<repo>/<id>`, easy to lose track of), at the cost of
  losing worktree isolation — **only one feature can be checked out at a
  time**. Create a second feature while the first has uncommitted changes,
  and `feature create` blocks on the clean-working-tree check exactly like
  it always did for `homero.config.json`'s dirty-tree guard; commit (or
  stash) first. To resume a feature from a different session, check out its
  branch (`git checkout feature/<id>-<slug>`) before running Homero commands
  for it — there's no more automatic worktree lookup.
- `workspace.worktreeRoot` removed from `homero.config.json` — no longer
  used. `homero-implementer`'s instructions (both clients) and
  `docs/homero/verification.md` updated to match: no more "confirm you're
  editing inside the worktree path," since there isn't one.

## 0.10.0

- **Fix: `homero feature check` had a circular dependency that could block
  every real feature from ever starting implementation.** It required
  Playwright CLI evidence (`playwrightEvidenceErrors`) — but evidence can
  only exist once something has been implemented, and `feature check` is
  the gate run *before* implementation (`/homero-plan`'s final check,
  `/homero-implement`'s precheck, `README`'s documented step 2). A
  plan-complete feature with zero code could never pass it, and no
  self-test ever caught this because the suite always pre-wrote fake
  evidence before calling `feature check`, never exercising the real
  "nothing implemented yet" case. `feature check` now only checks
  `featureErrors`/`planErrors` (matching what `homero run`'s own internal
  gate already checked, correctly, all along) — the same gate everywhere it
  runs. Evidence is still required, just where it actually belongs: `homero
  verify`'s gate, unchanged.

## 0.9.2

- **Speed: `homero-discovery` moved from the mid tier to the cheapest
  tier** (`sonnet` → `haiku`; `GPT-5.6 Terra` → `GPT-5.6 Luna`). It reads
  and reports, it doesn't decide — the same tier `homero-contracts` was
  already on. Only affects new installs/upgrades that pick up the template
  default; an already-configured repo's own `homero.config.json` value is
  untouched. The default model-pin set now maps cleanly to three tiers by
  what each role actually does: explore/cheapest (discovery, contracts),
  execute/mid (planner, implementer), think/strongest (figma, reviewer).

## 0.9.1

- **Speed: `homero-figma` now batches independent Figma reads across
  screens.** For a feature spanning multiple screens/nodes, it no longer
  has to finish one screen's MCP calls before starting the next's — nothing
  about one screen's read depends on another's. Depth per screen is
  unchanged (still the same exhaustive per-element analysis).

## 0.9.0

- **Fix: `homero-coordinator` had no `Edit`/`Write` tool, yet was
  instructed to "write" `spec.md`/`plan.md`.** It had to fall back to
  `Bash` (heredocs, `node -e`, etc.) to produce structured markdown — the
  most likely cause of plan.md ending up with a heading `feature check`'s
  gate didn't recognize, which reads as a missing section and forces an
  avoidable retry loop. `homero-coordinator` (Claude and Copilot) now has
  `Edit`/`Write`, scoped explicitly to `specs/<id>/spec.md` and
  `specs/<id>/plan.md` only — implementation files stay exclusive to
  `homero-implementer`, unchanged. New instruction: fill in the existing
  template sections in place, keep headings byte-for-byte, never regenerate
  the file from scratch.
- **Speed: `homero-figma` and `homero-contracts` now run in parallel**
  instead of sequentially. Both are required before `homero feature create`
  can run (it needs `--contract-mode` and a confirmed Figma node), and
  neither depends on the other's output — contracts needs contract
  mode/source/mock strategy, not exact Tomaco props or pixel detail.
  `homero-planner` still waits for both plus the created `feature.json`,
  since that dependency is real.

## 0.8.0

- **Fix: agents now default to Spanish when talking to the human.** Nothing
  in any template said what language to answer in, so a Spanish-speaking
  team could get English responses depending on session drift.
  `homero-coordinator` (Claude and Copilot), `AGENTS.md`, and
  `copilot-instructions.md` now say explicitly: Spanish by default (code and
  technical terms stay in English as normal), switching to whatever language
  the human actually writes in.
- **Fix: discover no longer asks for/analyzes a specific screen's Figma
  link.** `figmaSource` was a vague "Figma source of truth" question that
  read as "give me a URL to look at now" — during a phase that has no
  concrete screen yet. It's now explicitly scoped as a project-wide
  workspace/team convention at most (TBD is a fine answer), and
  `/homero-discover` (both clients) is told not to open, fetch, or analyze
  Figma content during discovery — that only happens per feature in
  `/homero-plan`, where reading it via MCP or human-pasted screenshots
  actually makes sense. `docs/homero/business.md`'s generated checklist
  heading also no longer collides with the `discover` command name.

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
