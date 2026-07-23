---
name: seguros-falabella-ui-ux
description: >
  UI/UX guidance for Seguros Falabella web interfaces based on the shared
  foundations and component patterns used by Tomaco-based products. Use this skill
  whenever the user asks to design, review, refine, or structure screens with
  Seguros Falabella colors, typography, spacing, grid, shadows, summaries,
  forms, tables, cards, tooltips, consent flows, checkout steps, or responsive
  layouts. Prefer established foundations and patterns over inventing a new visual
  language, and hand off to tomaco-design-system when exact components, props,
  utility classes, or tokens are required.
argument-hint: "Screen, component, or UI review goal"
metadata:
  version: "1.0"
  scope: ui-ux-guidelines
---

# Seguros Falabella UI/UX

Use this skill to keep UI work aligned with the Seguros Falabella web design language defined by the shared foundations and component system already documented in this repository.

Use this skill before proposing a new layout, component composition, or visual treatment. The default posture is reuse, hierarchy, and responsiveness.

## Core Output

When this skill is active, the answer should usually produce these decisions before code:

1. The closest existing pattern or flow family.
2. The container, grid, spacing, and elevation strategy.
3. The content hierarchy and primary-action strategy.
4. The mobile vs desktop behavior.
5. The point where implementation must switch to `tomaco-design-system` for exact API or CSS details.

## When To Use

- The user asks for a UI proposal, component, page, or layout aligned with Seguros Falabella.
- The user asks to review a screen against Falabella or Tomaco UI/UX rules.
- The task mentions foundations, colors, font family, grid, spacing, shadows, forms, cards, feedback, headers, summaries, tables, or responsive layout.
- You need to translate a Figma direction into implementation guidance without inventing a new design language.

This skill complements `tomaco-design-system`.

- Use this skill for visual hierarchy, layout decisions, responsive structure, and component-selection workflow.
- Use `tomaco-design-system` when you need exact React component names, published props, utility classes, tokens, or CSS validation.

Division of responsibilities:

- `seguros-falabella-ui-ux` defines **why** a pattern should be used, **where** it fits in a flow, and **how** hierarchy, spacing, elevation, and responsive structure should behave.
- `tomaco-design-system` defines **what exact component/API/class/token** can be used in code.
- Do not repeat published Tomaco prop names, exhaustive component inventories, or utility-class tables here unless a UI/UX decision depends on them.

## Never Do This

- Do not invent a new visual system if a known Seguros pattern already fits.
- Do not use product accent colors as the default text hierarchy.
- Do not infer exact Tomaco props or utility classes from visual patterns alone.
- Do not mix required consent, optional consent, validation, and navigation into one undifferentiated block.

## Working Rules

1. Reuse existing foundations first.
2. Reuse existing component patterns before proposing a custom one.
3. Use product colors for emphasis and product identity, not as uncontrolled interactive color.
4. Keep text hierarchy, spacing rhythm, and grid behavior consistent across desktop and mobile.
5. Prefer accessible, low-friction flows: clear grouping, clear labels, visible feedback, and restrained decoration.

## Default Layout Rules

Use these defaults unless the task clearly requires a documented variant.

### Containers and outer spacing

- Mobile baseline: design from a `375px` viewport with `24px` side padding.
- Desktop baseline: design from a `1280px` viewport with a `1152px` max content container and `64px` side margins.
- Full-width backgrounds may bleed edge to edge, but readable content should return to the container.

### Internal padding

- Cards, summaries, and boxed sections should usually start at `24px` internal padding.
- Larger grouped surfaces may scale to `32px` internal padding when they contain multiple form groups or dense explanatory content.
- Avoid mixing many unrelated padding values in the same screen.

### Spacing rhythm

- Default spacing scale: `4`, `8`, `16`, `32`, `64`.
- Use `16px` for tight related spacing such as label-to-input groups, inline actions, or compact card content.
- Use `24px` only when inherited from an existing component container or mobile gutter.
- Use `32px` between clearly separate blocks inside the same section.
- Use `40px` or `56px` as section bands between major layout regions when the screen needs stronger separation.

### Grid and composition

- On mobile, default to one main column. Only use two-up compositions for short peer elements such as small cards or paired fields.
- On desktop, prefer a primary content column with an optional secondary support column instead of many equal columns.
- A known desktop composition in the foundations uses an approximate `757 / 363` split inside the `1152px` container for main content plus summary.
- Three-up card layouts are acceptable on desktop when each card keeps consistent height, spacing, and action alignment.

### Forms and summaries

- Group related fields in blocks, not as one long undifferentiated list.
- Keep one clear primary action area at the bottom of the main task zone.
- Summary panels should support the task, not dominate it. On mobile they should stack below or collapse behind the primary flow.

### Text and color behavior

- Default body copy should stay in neutral text colors.
- Product colors are for accents, identifiers, emphasis states, and supportive illustration, not for long text passages.
- Borders and separators should remain light and quiet.

## Workflow

### Step 1: Classify the Task

Start by deciding which of these applies:

- **New screen**: define layout, hierarchy, component composition, and responsive behavior.
- **New component**: check whether the pattern already exists in Figma before creating a variation.
- **UI review**: compare the current proposal against foundations, component reuse, and responsive structure.
- **Refinement**: tighten hierarchy, spacing, colors, or interaction feedback without changing the overall flow.

If the task is primarily about code fidelity rather than UI structure, switch immediately to `tomaco-design-system`.

### Step 2: Anchor the Decision in Foundations

Load the foundation summary in [./references/foundation-summary.md](./references/foundation-summary.md) and use it as the baseline for visual decisions.

Minimum checks:

1. **Color**: neutral hierarchy for text and borders; decorative/product colors only where the system allows them.
2. **Typography**: page titles, section headings, paragraph text, labels, and inputs must reflect the documented scale.
3. **Spacing**: keep the x2 rhythm and avoid arbitrary one-off gaps.
4. **Grid**: use the documented desktop and mobile containers before inventing widths.
5. **Accessibility**: preserve contrast and avoid using decorative colors for critical interaction states.

If a task needs direct numbers and no additional context is available, use these operational defaults:

- Mobile page padding: `24px`
- Desktop outer margin: `64px`
- Desktop content max width: `1152px`
- Standard boxed surface padding: `24px`
- Larger grouped surface padding: `32px`
- Small gap: `8px`
- Related-content gap: `16px`
- Block gap: `32px`
- Major section gap: `40px` to `56px`

### Step 3: Reuse the Existing Component Library

Before proposing anything custom, check the component catalog in [./references/component-catalog.md](./references/component-catalog.md).

For form-heavy work, treat the form-patterns reference surfaced from the component catalog as required context.

The Figma file already groups patterns such as:

- Accordion
- Alerts
- Buttons
- Breadcrumbs
- Cards
- Checkout
- Feedback
- Form
- Header
- List
- Modals
- Summary
- Switch
- Table
- Tabs
- Footer
- Filters

Decision rule:

- If the task fits an existing component page or template, extend that pattern.
- If the task is adjacent to an existing pattern, compose existing building blocks before proposing a brand-new artifact.
- If a new pattern is unavoidable, keep the same typography, spacing, color semantics, and grid behavior as the existing system.
- If the answer now depends on exact Tomaco props, exported component names, or valid utility classes, stop the UI-only abstraction and load `tomaco-design-system`.

### Step 4: Build the Layout from Structure, Not Decoration

Use the grid and spacing rules to define order and emphasis first.

- On mobile, think in a narrow single-column structure with `24px` side padding and disciplined vertical rhythm.
- On desktop, use the wider container and split content only when comparison or parallel tasks truly benefit from it.
- Secondary content such as summaries, side panels, or support information should feel supportive, not visually louder than the primary task.

Default layout heuristics:

- Forms and checkout flows: primary content first, secondary summary beside it on desktop and below or collapsed on mobile.
- Form sections: usually separate groups with `32px` vertical space, with `16px` inside closely related field clusters.
- Lists and cards: consistent vertical rhythm, clear scan lines, and restrained accent color.
- Cards and boxed content: start with `24px` internal padding unless the existing component pattern already defines another value.
- Feedback states: strong title, concise message, one obvious next action.
- Tables and dense content: clear headings, visible row grouping, and enough breathing room around borders and labels.

### Step 5: Apply Interaction and Content Restraint

The design language favors clarity over novelty.

- Keep one primary action per section or step.
- Use secondary and tertiary actions only when they are materially different from the main goal.
- Group related fields and decisions together.
- Prefer progressive disclosure over showing every option at once.
- Use alerts, tooltips, banners, or helper text to reduce ambiguity, not to add noise.

### Step 6: Final Review Checklist

Do not consider the task complete until these checks pass:

- The proposal clearly reuses a known foundation and component pattern.
- Text hierarchy is consistent with the foundation scale.
- Color usage respects semantic intent and does not misuse decorative palettes.
- Spacing follows the system rhythm instead of arbitrary values.
- Mobile and desktop layouts both have an intentional structure.
- The screen has a clear primary action and readable content grouping.
- If implementation is requested, exact component props and class names are validated through `tomaco-design-system` or the installed package.

## Response Contract

Unless the user asked for raw code immediately, prefer answering in this order:

1. **Pattern choice**: which existing family or flow is the closest match.
2. **Layout decision**: container, split, spacing, and elevation.
3. **Behavior decision**: selection model, summary behavior, alerts, tooltips, or consent treatment when relevant.
4. **Responsive decision**: what changes on mobile.
5. **Implementation handoff**: whether exact component/class validation is now needed from `tomaco-design-system`.

## Review Output Format

When the user asks for a review, structure the response around these questions:

1. Which foundation rules are being followed?
2. Which foundation rules are being broken?
3. Which existing component pattern is the closest match?
4. What is the smallest change that improves hierarchy or usability?
5. What should remain unchanged because it already matches the system?

## Escalation Rules

- If exact Tomaco component names, props, or utility classes are needed, load `tomaco-design-system`.
- If the request depends on a precise variant or exceptional layout that is not clear from the catalog, inspect the corresponding design source before answering.
- If branding or marketing needs conflict with UI clarity, keep the UI structure readable first and use brand color as accent, not as overload.