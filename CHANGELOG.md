# Changelog

Homero doesn't publish to a registry, so this file exists for one reason:
explaining version boundaries that change `homero upgrade`'s behavior, not a
full history of every change. Run `homero version --target .` to see what
your install is actually on.

## 0.19.0

Fed two real, UI/UX-approved production codebases into the harness's design
skills (Tomaco's own component library source, and a full Salud repo scoped
to layout/composition only, since Homero serves the whole portfolio, not
one product) instead of relying on written guidance alone — plus three
smaller fixes from a direct critique/Q&A round.

- **New: `references/component-spacing.md` (Claude) /
  `tomaco-component-spacing.md` (Copilot)** — exact, source-verified default
  padding/dimensions/overflow for all ~35 Tomaco components, extracted
  directly from `tomaco-components`' own `.sass` files. Replaces "check the
  gotchas doc" with real numbers: `Input`'s own `16px 12px` default padding
  (the exact source of the 0.18.1 double-counting defect), `Dialog`'s real
  overflow behavior (`overflow: auto` on both axes, not `overflow-x:
  hidden` — the source of a real X-axis overflow defect), and why a raw
  Playwright `.click()` can misfire on `CheckBox`/`RadioButton`/`Switch`
  (absolutely-positioned native input under a label that commonly nests a
  link). `homero-figma`, `homero-implementer`, and `homero-reviewer` (both
  clients) now point at this file instead of a generic "check defaults"
  instruction, and `homero-implementer` gained an explicit rule to prefer
  `.check()`/`.setChecked()` over `.click()` for those three components.
- **`seguros-falabella-ui-ux`'s "Known Cross-Product Patterns" extended**
  with real, generalized (non-business-specific) composition patterns from
  a second approved product: the shared `Layout` molecule's real wrapper
  class and conditional padding, "which routes get a summary" as a
  Layout-level path-allowlist decision rather than a per-page one, and a
  real breakpoint-ambiguity gotcha (JS media query vs. Bootstrap-named grid
  classes in the same file, can't assume which stylesheet governs at
  runtime).
- **Fix: `homero-planner` could ask an "open question" it had already
  resolved itself**, redundant since the answer was already known. It now
  must try to resolve a question against existing repo patterns, the
  spec/contract, or `seguros-falabella-ui-ux`'s known patterns first, and
  state a resolved answer as a decision with citation instead of asking it
  again.
- **Fix: `/homero-discover` still spent a conversational question on
  `figmaSource`.** Even though the field only ever asked for a project-wide
  workspace convention (TBD always valid, never a specific screen's link),
  asking about it at all was redundant — `/homero-plan` is where a real
  per-feature Figma URL is actually collected. Discover now defaults it to
  `TBD` automatically and never asks.
- **Fix: `homero-planner` could bundle too much independent work into one
  task, leaving no checkpoint until all of it finished.** Traced with real
  data from a test feature (`FEAT-001`'s `state.json`/`events.ndjson`):
  `attempts: 0` on every task and zero `task-blocked` events confirmed the
  reported ~1h implementation time was *not* retry looping — one task
  covering contract, store, validation, country, and UI/browser tests
  together ran 37 uninterrupted minutes, and a separate task covering 10
  Playwright evidence scenarios across 3 countries and 2 breakpoints ran
  long enough to hit the agent runtime's own "working for a while" pause.
  `homero-planner` now splits test-heavy or evidence-heavy work into more,
  smaller ordered tasks along natural seams instead of one large task —
  same total work, more checkpoints.

**Open item, not resolved in this release**: the real, approved Salud
`Summary` widget reads its Zustand stores directly, which contradicts
`rules/step-widgets.md`'s existing "must not read state stores directly"
requirement. Left as-is pending a decision on which is the intended
convention going forward — see the extraction notes for the real code
citation.

## 0.18.1

- **Fix: a measured Figma spacing value could get applied on top of a Tomaco
  component's own default padding, producing *more* space than Figma shows,
  not the same amount.** 0.17.0 made `homero-figma` measure exact container/
  card padding via `get_variable_defs` — but a measured value is the
  *rendered result*, which may already include spacing the chosen Tomaco
  component provides by default. Nothing checked whether the component
  already accounted for some of that spacing before treating the full
  measured number as additional wrapper CSS to add. `homero-figma` (both
  clients) now records whether the component already provides some/all of a
  measured spacing value (checking `tomaco-design-system`'s component
  reference/gotchas) instead of reporting the raw number as if it were
  automatically extra CSS; `homero-implementer` (both clients) now confirms
  this itself before adding wrapper padding/margin around a Tomaco
  component, rather than applying a measured value as-is.

## 0.18.0

Real-world report: implementation took about an hour for a single-screen
feature. Read `verifyFeature()`'s actual code instead of guessing at the
cause and found a real, confirmed structural cost:

- **`homero verify` re-runs the entire project's `commands.lint`/
  `typecheck`/`test`/`e2e` on every attempt** — there was never any
  per-feature or per-file scoping, so a failed attempt (up to
  `maxVerifyAttempts`, default 2) re-pays the full project-wide cost again,
  not just the part that failed.
- **`homero-implementer`'s "focused validation after edits" was never
  actually defined**, which made it easy to read as "run the same
  project-wide `homero.config.json` commands after every task" — on a plan
  with several tasks, that's the full-project cost paid once per task
  instead of once per feature, which very plausibly dominates the wall
  clock on anything past a trivial change.

Fixes:

- `homero-implementer` (both clients) now defines "focused" explicitly:
  lint/typecheck scoped to the file(s) the task actually touched (e.g.
  `eslint <file>`, not the project-wide `commands.lint`), and only the
  Playwright CLI scenario(s) that task needs. The full `commands.lint`/
  `typecheck`/`test`/`e2e` stay `homero verify`'s job, once, at the end.
- Verification receipts now record `durationMs` per check (`homero verify`,
  `packages/cli/bin/homero.mjs`'s `runVerificationCommand()`) — so the next
  "why is this slow" question has real numbers per command instead of a
  guess, with a regression test pinning the field's presence.

Deliberately not changed yet: scoping the final `homero verify` gate's
`test`/`e2e` commands to just the feature's own files. That would cut real
wall-clock time but also cuts regression coverage of everything else the
change might have touched, and reliably mapping "which test files belong to
this feature" isn't something a zero-dependency, framework-agnostic CLI can
assume — worth revisiting with real `durationMs` numbers from an actual
receipt once the above two ship, not before.

## 0.17.0

A second real feature build got much closer to Figma (the plan-checkpoint
and branch/discover fixes from 0.16.x clearly helped — the plan itself
"asked things I hadn't even noticed"), but three concrete defects remained,
all traced to the same root cause: `homero-figma` was describing the design
qualitatively instead of extracting exact values, so `plan.md` had nothing
precise for `homero-implementer` to work from and it had to guess:

- A banner that should have been a green/positive Alert shipped yellow —
  the color was never actually extracted, just described as "an info box."
- A house icon next to the screen title never shipped at all — not
  downloaded, not mapped to a Tomaco icon, not even flagged as a question.
  Small inline icons were falling through the cracks of an instruction that
  only mentioned "images/icons/illustrations" in the abstract.
- A card that should have been narrow and visually contained (border,
  shadow, centered) shipped full-width with no visible boundary — its
  dimensions were assumed to match the page's outer layout instead of being
  measured on their own.

`homero-figma` (both clients) now has three new hard requirements, each
tied to the real defect it closes: call `get_variable_defs` before writing
the component mapping and record the exact token/hex for every colored
surface (documented Figma MCP best practice, not a Homero invention);
resolve every icon-shaped node to exactly one of Tomaco `iconName` /
downloaded asset / open question, with the same enumeration rigor already
required for form fields; and measure each screen-level card's own exact
width/padding/radius/shadow instead of assuming it matches the outer page
layout. `homero-planner` (both clients) now must carry those exact values
through into `plan.md` verbatim rather than a rephrased summary, and treat
any remaining vagueness as an "Open questions and critique" item instead of
passing it through unflagged. `homero-reviewer`'s plan mode (both clients)
now flags a `plan.md` with qualitative color/icon/dimension language as a
blocking finding, same severity as an unconfirmed interactive element.

## 0.16.1

- **Fix: `/homero-discover`'s closing report overstepped into feature-planning
  territory.** After a real run, the coordinator's "next step" wrap-up
  proposed a specific guessed feature name/id and offered "start the plan
  assuming a basic mock" as an option while Figma wasn't available yet —
  discovery inventing exactly the kind of shortcut constitution.md principle
  2 forbids, and deciding something that isn't discovery's call to make.
  `/homero-discover` (both clients) now has an explicit closing-report
  instruction: report what was recorded, then one plain sentence pointing at
  `/homero-plan`/`/homero` — no guessed feature name, no menu of options, no
  Figma-less/mocked shortcut "in the meantime."

## 0.16.0

Real-world report: running `/homero-discover` on Copilot put the human in a
direct chat with Claude Haiku, not the expected cheap-GPT tier. Two
compounding bugs, both Copilot-specific:

- **Breaking: `agents.models.copilot`'s per-role pins ("GPT-5.6 Luna" /
  "GPT-5.6 Terra" / "GPT-5.6 Sol") were never real Copilot model-picker
  names** — they were shorthand invented for the tier *concept*
  (explore/execute/think), mistakenly written into the config as if they
  were literal, selectable values. An unresolvable `model:` value in a
  Copilot agent's frontmatter falls back silently to whatever Copilot's own
  default is, which is how a Copilot session ended up in Claude Haiku. Every
  `agents.models.copilot` pin now ships empty (`""`, same as
  `homero-coordinator` already was) — Copilot's real model-picker names are
  org/subscription-specific and change over time, so Homero can't safely
  guess one; the `_comment` explains how to fill them in with your own
  real names if you want per-role tiering. Only affects new installs/
  upgrades that pick up the template default; an already-configured repo's
  own recorded values are untouched.
- **Fix: `homero-coordinator.agent.md` (Copilot) had a `handoffs:` block**
  ("Start Discovery" → `homero-discovery`, "Review Implementation" →
  `homero-reviewer`) that let the human jump directly into a sub-agent's
  chat, bypassing the coordinator entirely — the actual mechanism that put
  the human in `homero-discovery`'s (broken) model pin instead of the
  coordinator's unpinned one. This contradicted an intended design rule that
  was never actually written down anywhere: the human only ever talks to
  `homero-coordinator`; every other agent works in the background and
  reports back to it. Removed the `handoffs:` block; added this as
  constitution.md principle 20 and a bullet in `agent-roles.md`'s
  Coordinator section, on both clients, so no future template edit
  re-introduces a direct human-to-subagent path.

## 0.15.0

A full-project audit (6 parallel finders, every finding independently
re-verified) surfaced 26 real issues across the CLI, the test suite, the
docs, and both template adapters. All were fixed.

**Doc drift (both were flatly wrong about current behavior):**
- `constitution.md` principle 7 and `copilot-instructions.md` still said
  `feature create` "creates a local branch" — the exact opposite of the
  0.12.0 change (it refuses to run on main and requires one to already
  exist). Both missed that pass.
- `docs/architecture.md` and the CLI's own `--help` text said discover has
  "~32" questions; the real count is 35.
- `verification.md` implied the Figma/Tomaco portion of `feature check` was
  stronger than it actually is — rewritten to say plainly what is and isn't
  gated (see the new enforcement section below).

**New mechanical gates:**
- **Figma node-id, principle 2**: `feature.json` stored `design.figma.nodeId`
  but `featureErrors()` never read it back — a Figma URL missing `node-id`
  (points at the whole file, not an approved screen) passed `feature check`
  regardless. Now checked, with a dedicated regression test.
- **"Repo patterns to reuse," principles 15/19**: this `plan.md` section
  existed but had no gate at all — it could stay the unedited template
  placeholder forever. It's now one of `requiredPlanSections`, giving real
  teeth to "record what you found before creating a new widget or rebuilding
  page chrome a sibling screen already provides." Proves the search was
  recorded, not that its conclusion was correct — that's still
  `homero-reviewer`'s job, documented explicitly now in `verification.md`.
- `docs/homero/verification.md` gained an honest breakdown of what's
  mechanically gated vs. agent-instruction-only (country-logic isolation and
  the human-review pause have no code-level check at all, and that's stated
  plainly instead of implied otherwise).

**CLI cleanup (packages/cli/bin/homero.mjs), all behavior-preserving:**
- Removed `writeTextFile()` (dead — every real doc write goes through the
  sibling `writeDiscoveredDoc()`).
- Simplified `hasFlag()` — its `commandArgs.includes(name) ||` clause could
  never independently change the result (`commandArgs` is a subset of `args`
  by construction).
- `featureCheck()`'s trailing if/else always returned the same shape;
  collapsed to one return.
- New shared helpers removing four separate copies of one guard:
  `requireTargetAndId()` (the identical `--target`/`--id`/`--help` check in
  `featureCheckCommand`/`verifyFeature`/`runLoop`/`taskStatus`),
  `verifyLimitFor()` (the identical `maxVerifyAttempts` fallback chain in
  three functions), `findTaskOrFail()` (the identical task-lookup-or-fail
  pair in `taskVerify`/`taskBlock`).

**Self-test coverage for fail() branches that had zero regression coverage**
(self-test.mjs is the project's only test suite — an untested branch is a
real gap, not a nitpick): the 5 "unknown command" typo-safety-net branches
(main dispatcher plus feature/task/setup/generate subcommands), the invalid
`--client` rejection, `ensureCleanGitRepo`'s dirty-tree rejection (through
both `feature create` and `upgrade`) and its "not a git repository" branch,
`readJsonFile`'s malformed-JSON message, and `discover`'s non-interactive-
without-`--defaults` guard (the only thing stopping it from hanging forever
in a CI/non-TTY context).

**Template symmetry (Claude ↔ Copilot):**
- Copilot's `frontend.instructions.md` collapsed Claude's `rules/tomaco.md`
  rich `'use client'` rationale (the packaging explanation, the "don't
  verify by grepping for createContext" warning, the presentational-
  component exception list) into one sentence. Ported the full version over.
- Claude's `component-catalog.md` listed `Capcha`/`Templates pages`/
  `Template PDF`/`Templates Emails` as detected Figma areas; Copilot's
  inlined catalog never mentioned them. Added.
- `rules/frontend.md`, `step-widgets.md`, `server-actions.md`, and
  `transport-patterns.md` were never referenced by path from anything an
  agent would actually open on the Claude side (Copilot's equivalents
  auto-apply via a real `applyTo` glob; Claude's relied on a vague "client-
  specific rules" mention in `CLAUDE.md` with no filenames). `CLAUDE.md` now
  names all four explicitly, with a one-line trigger condition for each.
- Fixed a wording slip introduced in 0.14.0: several agent instructions
  told the planner to record reuse findings under "Reused repo patterns" —
  the real `plan.md` heading is "Repo patterns to reuse." Fixed everywhere.

Also reviewed and confirmed fine, no change needed: `scripts/bootstrap-
harness.mjs`/`validate-harness.mjs` looked like legacy-script candidates but
are actively referenced by CI and docs as intentional thin wrappers; a
broader sweep of repo root/`scripts/`/`packages/` found no orphaned files;
`--help` is exercised in CI (via those same wrappers) even though
self-test.mjs itself never passes it.

## 0.14.0

Design-system skill content enriched from three real, UI/UX-approved
Falabella Seguros products — two frontends on Tomaco (Salud) and Tailwind
(Vida, for UX-level patterns only, never CSS), plus a scoping pass over two
backends. Also **corrects a mistake shipped in 0.13.0**: the "check the app's
root layout" instruction (constitution.md principle 19, `architecture.md`'s
App shell section, `homero-planner`/`homero-implementer`/`homero-reviewer`)
would not actually have caught the real duplicate-header bug it was written
for — in a real repo, chrome lives in a shared `Header`/`Layout` molecule
every screen imports explicitly, and the root layout itself renders only
providers. All five now say to check how sibling screens/pages actually
compose their chrome, not just the framework's root layout file.

New content, `seguros-falabella-ui-ux` (both clients):

- "Known Cross-Product Patterns": a named page-composition pattern (chrome
  molecule → content → form/summary split), and the "¿Estoy recibiendo ayuda
  de un asesor?" switch — confirmed identical in two independent products
  (reveals a required, validated "Código del asesor" field) — explicitly
  scoped to the sales/quote flow, not assumed to apply to servicing/post-sale
  screens. `homero-figma`/constitution.md principle 14 now say to check this
  list before treating a recognized element as a blank unknown, and present
  a match as "detected known pattern — confirm" instead of asking from zero.
- Real validation-copy register ("Debes ingresar un/una `<campo>` válido/a",
  etc.) as a style reference, not a substitute for Figma-sourced copy.
- Confirmed font family (Maven Pro, `next/font/local`) — previously
  undocumented.

New content, `tomaco-design-system` (both clients):

- "React Hook Form integration": the real, load-bearing `Controller`-wrapper
  pattern (`InputController`, `InputDateController`, etc.) for wiring Tomaco
  atoms — which aren't natively RHF-controlled — into forms. Previously
  undocumented; `homero-implementer` had no guidance here at all.
- Anti-pattern note: no trivial wrapper components around a Tomaco atom with
  no real logic (the `Controller` wrappers above are the legitimate
  exception).
- CSS gap: when Tomaco's fixed container widths don't cover an arbitrary
  content width, define a small set of project-level custom classes named
  after the real pixel value, confirmed as the real pattern (not inline
  styles).

`rules/forms.md`/`forms.instructions.md`: `mode: 'onTouched'` and restoring
`defaultValues` from a step's state store, both confirmed real conventions.
`rules/tomaco.md`/`frontend.instructions.md`: sharpened the styling-layer
order (Bootstrap for layout, Tomaco for tokens, minimal custom CSS only for
real gaps) to match the real, more precise articulation found in a
production repo's own team conventions doc.

`homero-contracts` (both clients): real backends don't share one error
envelope — two confirmed, incompatible conventions exist — so don't assume
a universal "Falabella error shape"; do preserve real header conventions
(`x-country`, `x-channel`, `x-trace-id`) found in a cURL-format contract
source.

Explicitly **not** changed: `css-utilities.md`/`foundation-summary.md`'s
existing spacing/breakpoint/token numbers — independently confirmed exact
against the real Tomaco-based product, zero corrections needed. Tailwind
-specific values from the Vida research (different spacing, arbitrary
bracket values) were deliberately not incorporated — they belong to a
different styling technology, not a Tomaco correction.

## 0.13.0

Real-world feedback from a first implemented feature: `homero-implementer`
duplicated the app's existing header/logo inside the screen instead of
reusing the root layout, and error-message copy didn't match Figma. Two
targeted fixes, both closing gaps between what agents were told and what
they actually checked before writing something down:

- **New: page-chrome reuse (constitution.md principle 19).** A screen or
  step component must not rebuild a header, top nav, logo bar, or footer
  that the app's root layout (`app/layout.tsx` or equivalent) already
  renders — that produces a visible duplicate, not a stylistic choice.
  `homero-planner` now checks this and records it under "Reused repo
  patterns" before listing files to create; `homero-implementer` checks it
  again before writing any chrome markup as a safety net; `homero-reviewer`
  flags a duplicated header/logo as a blocking finding in both plan and
  implementation mode. `docs/homero/architecture.md`'s generated template
  gained a short "App shell" section naming where chrome actually belongs,
  so agents have somewhere concrete to check instead of guessing the
  convention fresh each time.
- **Fix: validation error copy was being invented instead of sourced from
  Figma.** `homero-figma` said to "confirm the exact validation error copy"
  but never said to actually look for it — most designs put error copy on a
  separate error/invalid-state component variant, not inline in the
  happy-path frame, so a plain read of the frame it was pointed at found
  nothing and produced generic copy ("Campo requerido") instead. Constitution
  principle 14 and `homero-figma` (both clients) now require actually
  checking for an error-state variant via `get_metadata`/`get_design_context`
  before writing error copy down; if none exists anywhere in the file after
  actually looking, that's an open question, not license to invent one.

## 0.12.0

- **Breaking: `homero feature create` no longer creates the feature branch —
  it requires one to already be checked out.** 0.11.0 replaced the worktree
  with an in-place `git checkout -b`, but that still meant the CLI, not the
  human, decided the branch name and when it got created. Now the human (or
  `homero-coordinator`, which checks first and asks rather than running
  `checkout -b` itself) checks out a non-main branch before running `feature
  create`; the command writes `features/<id>/`, the evidence manifest, and
  `specs/<id>-<slug>/` straight into whatever branch is already active, and
  refuses to run at all on the main branch (`mainBranchName()` reads the
  remote's default branch when one exists, else falls back to `main`/
  `master`). Detached HEAD also refuses. `docs/homero/verification.md`,
  `docs/usage.md`, and both `homero-coordinator` templates updated to match.
- **Fix: planning agents were treating visual obviousness as behavioral
  clarity.** A plain button or a form toggle reads as self-explanatory, so
  `homero-figma` and `homero-planner` weren't flagging them as open
  questions even when nothing actually said what they *do* — a real case:
  an "advisor mode" switch on a form shipped through `/homero-plan` with no
  question asked about what it toggles. `homero-figma`'s and
  `homero-reviewer`'s enumeration language (constitution.md principle 14)
  now applies to every interactive element, not just the visually unusual
  ones (tooltips, ghost buttons, accordions) it previously called out by
  example. `homero-planner` now returns a separate "open questions and
  critique" section — a critical re-read of spec.md/Figma output for
  unconfirmed element behavior, implied-but-unconfirmed business rules, and
  worthwhile alternatives, distinct from `homero-figma`'s own design-level
  questions. `homero-coordinator` now must surface every item from both
  lists in its plan-checkpoint report, not just the ones it judges
  "blocking" — silently resolving an unclear element with a plausible
  default is the exact failure this closes.

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
