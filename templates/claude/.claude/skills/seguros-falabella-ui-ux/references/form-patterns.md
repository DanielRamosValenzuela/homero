# Form Patterns

This reference captures recurring UI/UX rules from the Seguros Falabella form and selection patterns.

Its purpose is structural and behavioral guidance only.

- Use `tomaco-design-system` for exact component names such as `Input`, `TextArea`, `CheckBox`, `RadioButton`, `Select`, `InputDate`, `Upload`, `Alert`, or `Summary`.
- Use this file for layout, hierarchy, selection behavior, validation placement, and flow composition.

## Field stack baseline

Observed repeated structure:

- A form surface often uses a centered card or content box inside the page grid.
- Common single-column field width in examples: around `464px` inside a `544px` container.
- Field rows frequently stack with a stable vertical rhythm rather than irregular manual spacing.

Practical rule:

- Keep form fields aligned to one clean column unless paired inputs clearly belong together.
- Use paired fields only when the user can understand both as one decision block.
- Avoid mixing wide and narrow fields without a visible structural reason.

## Input text and text area

Patterns observed:

- Text inputs expose states such as default, focus, invalid, disabled, autofill, and action-icon variants.
- Text areas expose default, value, focus, invalid, and disabled-like states.

UX rule:

- Validation belongs next to the affected field, not in a distant global message.
- Disabled inputs should remain readable enough to preserve context.
- Text areas should be reserved for genuinely open-ended input, not as a substitute for missing structured fields.

## File input

Patterns observed:

- File input variants include default, success, invalid, and loader states.
- File upload areas are treated as part of the normal form stack, not as a detached widget.

UX rule:

- File upload must clearly communicate state: idle, loading, success, or error.
- If upload is asynchronous, the loading state must not look like a frozen screen.
- Keep file inputs close to the text or checklist that explains why the document is needed.

## Date input

Patterns observed:

- Date input is shown as a dedicated date picker field, not as free text.
- Multiple date states are represented as field variants rather than ad hoc formatting.

UX rule:

- Use a date control for dates, not generic text input.
- Avoid ambiguous date formatting in labels or placeholder text.

## Placeholder and data masking

Patterns observed:

- Placeholder guidance exists as a dedicated pattern family.
- Data masking or ofuscamiento rules are documented as list-based cases.

UX rule:

- Placeholders should clarify expected input, not duplicate the label with no added value.
- Sensitive values shown back to the user should follow a masking rule, especially in summaries, lists, or contracting recaps.
- Never rely on placeholder text as the only field descriptor.

## Checkbox patterns

Patterns observed:

- There are single and multiple selection cases.
- Country-specific opt-in guidance exists for Chile, Peru, and Colombia.
- Contracting flows distinguish clearly between required acceptance and optional consent.

UX rule:

- Required legal acceptance must be visually and semantically separate from optional marketing or lead-capture consent.
- Optional consent should never compete visually with the primary action.
- Multi-select checkboxes are appropriate when several options can coexist; do not use them for mutually exclusive decisions.

Country flow guidance captured from the design source:

- Lead-capture consent belongs early in the quote flow.
- Terms and conditions acceptance is mandatory before contracting and may appear in checkout, user data, or DPS.
- Optional consent can appear in checkout or user-data steps, but should remain clearly optional.

## Radio patterns

Patterns observed:

- Basic radio lists use single-choice stacked rows.
- A second variant combines title plus supporting description.
- A third variant uses selectable full-row cards and may include nested follow-up questions.

UX rule:

- Use radio groups only for mutually exclusive choices.
- When the consequence of each choice is not obvious, add a subtitle or descriptive row.
- Full-row selectable cards are appropriate when the decision is important enough to deserve more context and a larger clickable area.
- When a follow-up question depends on the selection, reveal it progressively under the selected choice instead of flooding the screen up front.

Documented behavior:

- Radio/card width should adapt to the active grid.
- In full-row card variants, the whole card should be clickable.

## Alerts inside forms

Patterns observed:

- Inline messages appear above or near the affected field group.
- Some summary variants also embed alerts within recap content.

UX rule:

- Use inline alerts to explain a field problem, blocking condition, or contextual warning.
- Do not replace field-level validation with a distant summary-only warning.
- If the alert affects the next action, keep it within the same scanning zone as the action and the field.

## Summary and fixed actions

Patterns observed:

- Contracting summaries appear as desktop side panels and mobile fixed/bottom-sheet style surfaces.
- Mobile summary variants rely on fixed action areas and simplified collapse behavior.
- Some summary variants can include promo content, masked data, or inline alerts.

UX rule:

- The summary is support content, not the main reading path.
- On desktop, keep it persistent when it helps decision confidence.
- On mobile, condense it and protect the primary task from being buried under recap detail.
- Fixed action bars should stay stable and predictable across steps.

## Form decision checklist

Before finalizing a form or checkout proposal, confirm:

1. Labels, help text, validation, and consent are visually separated by purpose.
2. Required acceptance and optional consent are not mixed into one ambiguous block.
3. Selection controls match the decision model: checkbox for multi-select, radio for single-select.
4. Follow-up questions appear progressively, not all at once.
5. Summary content supports the flow without overpowering the main form.
6. If implementation details are needed, the response switches to `tomaco-design-system` for exact components and classes.