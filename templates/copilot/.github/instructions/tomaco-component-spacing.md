---
applyTo: "**/*.{ts,tsx,css,scss}"
---

# Tomaco component default spacing, dimensions, and overflow — reference

> Verified against `tomaco-components@1.14.42` by reading each component's own
> `.sass` file under `styles/components/` (not the generated `.d.ts`/prop
> catalog, which says nothing about baked-in CSS). Confirm against your
> installed version before treating a number here as current.
>
> This file exists because a Figma-measured spacing/dimension value is the
> *rendered result*, which already includes whatever a Tomaco component bakes
> in by default — homero-figma/homero-implementer need the real baked-in
> number to avoid double-counting it, not just an instruction to "check."
> Two real defects motivated this file: wrapper CSS stacked on top of
> `Input`'s own `16px 12px` default padding produced more gap than Figma
> showed, and a `Dialog` shipped with horizontal overflow because nobody
> checked that Dialog does not clip its X axis by default.

## Root-cause: Input (padding double-counting)

`Input`'s own CSS (`forms.sass`): `padding: 16px 12px`, `min-height: 56px`,
`max-height: 56px`, `border: 1px solid var(--neutral20)`, `border-radius: 8px`,
`font-size: 20px`. Focus state: `border-color: var(--lime20); border-width: 1.5px`.

**Any wrapper CSS adding vertical/horizontal padding around an `<Input>`
stacks on top of this baked-in `16px 12px`.** A measured Figma gap of, say,
`24px` around an Input almost always already includes some or all of this
`16px` — the field's own padding is part of what you measured, not extra
space Figma wants you to add again on a wrapper. Before adding wrapper
padding/margin around an `Input` (or `TextArea`/`Select`, which share the
same base rule — see below), subtract what the component already provides
and only add the remainder, or reconsider whether a wrapper is needed at all.

Related, same file:

- Native `select` (used by Tomaco's own `Select`): `height: 56px; padding: 12px 46px 12px 16px`
  (46px right padding reserved for the dropdown arrow).
- `textarea`: inherits the input rule but `max-height: inherit !important` (no cap).
- `react-select` (`SelectSearch`) control: `height: 56px`,
  `.react-select__value-container { padding: 0 16px }`.

## Root-cause: Dialog (X-axis overflow)

`Dialog`'s own sizing (`dialog.sass`): `max-width: 640px; min-width: 320px`
(desktop `min-width: 640px`), **`overflow: auto` on both axes — not
`overflow-x: hidden`**, `border-radius: 16px`. Mobile
(`max-width: $bp-mobile-large`): `width: 100% !important; max-width: none`.
`.dialog__body { padding: 0 24px 24px; overflow-y: auto }`.

**Dialog does not clip horizontal overflow itself.** Any child content wider
than the dialog's own usable width — a wide table, a fixed-px-width element,
an unwrapped long string, an image without `max-width: 100%` — produces
horizontal scroll inside the dialog body, because nothing in Dialog's own
CSS stops it. Usable content width is `640px` minus `24px` left+right body
padding = **592px** on desktop (less on mobile, where the dialog is 100%
viewport width minus the same padding). Before adding content wider than a
rough estimate, or content with a fixed px width, inside a `Dialog`, check it
against that usable width, and default new custom content inside a `Dialog`
to `overflow-x: hidden` unless horizontal scroll is the actual intent —
`.dialog__body`'s own `overflow-y: auto` is for vertical (tall content), not
a signal that horizontal overflow is expected too.

## CheckBox / RadioButton / Switch — why a raw Playwright `.click()` can misfire

All three are plain native `<input type="checkbox">`/`<input type="radio">`
with a real `htmlFor`-linked `<label>` — not custom div-based widgets. Styling
uses `appearance: none` plus a `background-image` data-URI checkmark; this is
purely visual and doesn't change native `checked`/`change` behavior.

The failure mode is specific to the **`container`/card-style variant**
(`input-selector-container`, used for "card-style" checkable options): the
real `<input>` is `position: absolute` **underneath** a full-width `<label>`
that carries the visible padding (`padding: 24px 24px 24px 68px`) and
box-shadow, and that label commonly contains a nested `<a>` (legal-text
links inside checkbox labels are a real, repeated pattern — the CSS has a
dedicated `& + label a { ... }` rule for it). A coordinate-based click can
land on the link, on padding, or trip Playwright's actionability/scroll
checks against an absolutely-positioned, visually-offset input. Use the
semantic action (`page.getByRole(...).check()`/`.setChecked()`) instead of a
raw `.click()` for these three components — it drives the native
`checked`/`change` state directly through the accessibility tree, not screen
coordinates, and does not depend on what's visually on top of the input.

## Other components — default padding/dimensions/overflow

Verified against each component's own `.sass` file. Not a prop reference —
see `tomaco-component-api.md`/`tomaco-component-gotchas.md` for props and
behavioral traps.

| Component | Default padding / sizing | Notes |
| --- | --- | --- |
| `Card` | `.card { padding-bottom: 64px }` (room for absolutely-positioned footer); `section { padding: 16px }`; `border-radius: 16px`; `border: 1px solid var(--border-color)` | |
| `Alert` | Default `padding: 16px 16px 16px 60px` (60px left reserved for icon); `--default` variant flat `16px`; closable/has-close adds `padding-right: 60px` | |
| `Feedback` | `padding: 24px` (desktop `40px`); `max-width: 736px` | |
| `ActionsFooter` | `.sf-footer { position: fixed; bottom: 0; padding: 18px; min-height: 88px }` | fixed to viewport bottom by default |
| `Summary` / `SummaryDev` | `padding: 24px`; mobile-sheet variant `__sm`: `position: fixed; bottom: 0; padding: 16px 24px` | byte-identical duplicates, see `tomaco-component-gotchas.md` |
| `Accordion` | `__header { padding: 16px 24px }`; closed `__body { max-height: 0 }`, active `max-height: 700px` | |
| `Tab` | `__tab { padding: 16px; min-width: 96px }` | |
| `Table` | `th, td { padding: 25px }` | text-centered by default |
| `Tooltip` | Bubble `padding: 12px 16px; max-width: 220px; border-radius: 8px` | |
| `Badge` | `padding: 4px 8px; border-radius: 4px` | |
| `Breadcrumbs` | `--level__location { padding: 4px 8px; border-radius: 6px }` | |
| `Button` (shared `.btn` class) | Default `padding: 16px; min-height: 56px; min-width: 168px; border-radius: 512px` (pill). `.small`: `padding: 8px 16px; min-height: 40px` | applies to any Button-driven surface (Dialog buttons, ActionsFooter, etc.) |
| `QuantitySelector` | Circular buttons `42px × 42px`, `border-radius: 100%` | |
| `CheckBox`/`RadioButton` container/card variant | `.input-selector-container input + label { padding: 24px 24px 24px 68px }` | see overflow/click note above |
| `SelectableCard` | Mobile `padding: 0 16px`; desktop `padding: 16px`; image `150×123` mobile / `273×250` desktop | |
| `PaymentMethod` | `padding: 21px 16px; border-radius: 8px` | |
| `Loader` | Spinner `64px × 64px` (small: `22px`) | |
| `InputDate` | Wraps `react-datepicker`; custom skin `.tomaco-datepicker { border-radius: 24px }` | |
| `InputDateLite` | No dedicated sass file found — check `InputDateLite/index.tsx` directly; likely shares `forms.sass`'s base input rule | verify before assuming |
| `InputPlate` | Per-digit box: `height: 3.5rem; max-width: 2.313rem; border-radius: 0.5rem` | OTP/plate-style input |
| `Header` | Mobile `padding: 24px 16px`; desktop `padding: 24px 30px`; `margin-bottom: 40px`/`56px` | |
| `CookieDialog` | `.dialog-tyc { padding: 24px }` | no `isOpen` prop — see `tomaco-component-gotchas.md` |
| `ComparisonCard` | `__body { padding: 24px 16px 0 }` | |
| `ProductCard` family | `__container { border-radius: 16px }`; `section { padding: 24px 16px 16px }`; `footer { padding: 8px 16px 16px }` | |
| `SelectSearch` | Inherits `react-select` control height `56px` (see Input section) | |
| `Icon` | Sprite/mask CSS (`icons.sass`) — resolve via `iconName` prop, never hand-roll SVG paths or measure the sprite sheet | |

## Shared tokens

Breakpoints, spacing-helper classes, colors, border-radius, and shadow
tokens are already exhaustively documented in `tomaco-css-utilities.md` —
this file only adds the per-component baked-in defaults that file doesn't
cover. Confirmed matching between the two: Tomaco-native breakpoints
`sm=768 md=992 lg=1200 xl=1280` differ from the bundled Bootstrap-style grid
`sm=576 md=768 lg=992 xl=1200 xxl=1400` (same collision documented in
`tomaco-design-system.instructions.md`'s "Utility-class traps" and in
`tomaco-css-utilities.md`).
