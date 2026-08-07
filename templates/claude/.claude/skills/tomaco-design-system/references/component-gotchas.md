# Tomaco component gotchas — full per-component reference

> Verified against `tomaco-components@1.14.42` by reading the real source at
> `components/<Name>/index.tsx` (+ `index.test.tsx`, + the matching story in the
> Tomaco Storybook where one exists). Confirm against your installed version before
> treating any of this as current — component internals are not covered by
> `references/component-api.md` (name/description/keywords only) and do not show up
> in TypeScript types, so this file is the only source for them.
>
> `SKILL.md` keeps the short, cross-cutting version of this list (patterns that repeat
> across many components) for a fast skim. This file is the exhaustive per-component
> version — look up a component by name here before writing code against it.
>
> `Badge` and `Switch` were audited and had nothing surprising to report.

## Accordion

- `activeItem`/`activeItems` are 1-based item numbers, not 0-based array indices.
  `activeItem={0}` means "nothing open," not "open the first item" — to open the
  first item (array index 0) set `activeItem={1}`.
- `multipleOpen` gates two entirely disjoint controlled-state prop pairs:
  `activeItem`/`setActiveItem` (single) vs `activeItems`/`setActiveItems` (multi).
  Wiring the wrong pair for the current mode is a silent no-op — clicks fire but
  nothing the caller is watching ever updates.
- Passing a custom `icon.style.width` breaks the title's `paddingLeft` due to an
  operator-precedence bug (`icon.style?.width || 26 + 24` parses as
  `width || 50`, not `(width||26)+24`). The icon stays absolutely positioned at
  `left: 24` with your custom width, but the title text starts at exactly your
  width value — they overlap.

## ActionsFooter

- The back button's label is hardcoded to the literal `"Volver"` (and its icon
  color to `#3C4043`), with no prop to override either. The component's own
  `text` prop only controls the primary/forward button.

## Alert

- `clossable` is the real prop name (see SKILL.md misspelling table).
- If `children` is omitted, Alert renders a hardcoded Spanish placeholder —
  `<b>Título</b> Sin texto` — instead of being empty. Easy to ship by accident.
- `clossable` has no effect on visibility by itself: there is no internal
  open/closed state. The close (×) link just fires `onClick` (default no-op); the
  markup stays mounted forever unless the caller removes the Alert from its own
  state.

## Breadcrumbs

- The separator between levels is a hardcoded `<img>` pointed at a specific Azure
  Blob Storage URL — not an inline icon, not a prop. If that CDN is unreachable
  (offline dev, on-prem firewall, CSP), the separator silently doesn't render, and
  there's no prop to swap it for a local/inline one.
- A house/home icon is auto-injected before the first level's text, but only when
  `levels.length > 1`. With the default single-item `levels` array it does **not**
  appear (the sole level renders via the `<span>` branch, not the `<a>` branch that
  holds the icon) — inconsistent with what you'd expect from a single-crumb page.

## Button

- `terciary` is the real variant name (see SKILL.md misspelling table). Does not
  accept `children` — the label goes in `text`. No separate `Link` component; use
  `appearance="link"`.
- Default `type` is `"submit"`, not `"button"`. A Button inside a `<form>` without
  an explicit `type="button"` submits the form on click.
- `preventDefault` (default `true`) only affects the link/anchor render path
  (`appearance="link"` or `isLink`). It's silently ignored on the native
  `<button>` path — passing `preventDefault={false}` there does nothing.
- `iconPosition="center"` only renders the icon when `text` is empty; passing both
  `text` and a center icon silently drops the icon. `"left"`/`"right"` icons
  always render regardless of `text`.
- `isLink` (boolean) and `appearance="link"` (enum) are two independent props that
  do the exact same thing — a redundant duplicate toggle.

## Card

- `badge` only renders inside the `<figure>` that requires `image.src` — pass
  `badge` without `image` and it silently renders nothing (confirmed intentional
  by the component's own Storybook).
- The `button` prop's `className` is always overwritten with a hardcoded
  `"small px-16"` — there's no way to add classes to Card's button via the
  `button` prop.
- `image` is a full `ImgHTMLAttributes` object, not a URL string. Passing a bare
  string renders nothing (`image?.src?.length` is undefined). Omitting
  `width`/`height` forces a `290x150` box regardless of the real image's aspect
  ratio.

## CheckBox

- `children` is the visible label text (not decorative content) and defaults to
  the literal `"Lorem Ipsum"` if omitted — easy to ship since it isn't a required
  prop.
- `name` defaults to the hardcoded `"checkbox"`. Multiple CheckBoxes on one page
  without an explicit `name` all share `name="checkbox"`.

## ComparisonCard

- `title` and `footerText` both independently default to `"Lorem Ipsum"` —
  forgetting either ships visible placeholder text.
- `details[].type` must be exactly `"check"` or `"cross"`. Any other value
  (including `""`, used in the component's own test) silently drops the icon
  styling with no error.

## CookieDialog

- Unlike the sibling `Dialog`, CookieDialog has **no `isOpen` prop at all** — it
  always renders its full markup once mounted. The caller must handle show/hide
  externally (mount/unmount it).
- `closeHandler` has no effect unless `buttonText` is also a non-empty string —
  the entire actions block (the only place `closeHandler` is wired) is
  conditionally omitted otherwise.

## Dialog

- `isOpen`'s default is `!animated`, not `false`. `animated={true}` is the
  overall default, so `isOpen` defaults closed as expected — but
  `<Dialog animated={false} />` alone (meant to just disable the transition)
  makes the dialog default to **open**.
- The title element's `id` and the dialog's `aria-labelledby` never reference the
  same node: `aria-labelledby` is the hardcoded literal `"dialog-title"`, but the
  title's actual `id` is `` `${title}-dialog-title` ``. Two Dialogs sharing a
  `title` string also produce duplicate DOM ids.
- No `Modal` component exists — this is it (see SKILL.md).

## Feedback

- `setShowAlert` is named like a `useState` setter but is a plain
  `MouseEventHandler` wired straight to the close link's `onClick`. Passing a raw
  `useState` dispatcher sets state to the click's `MouseEvent` object (truthy),
  not `false` — the alert appears to stay open instead of closing. Both the
  component's own test and its Storybook story had to hand-write a real handler
  rather than pass the dispatcher directly.
- `children` (required) is unconditionally wrapped in a `<p>`. Passing
  block-level content (`<div>`, `<ul>`, another `<p>`) produces invalid nested
  HTML.

## Footer

- `backButton` defaults to `true` and `backOnClick` defaults to a no-op. An
  unconfigured Footer silently renders a visible back button that does nothing
  on click, unless you explicitly pass `backButton={false}` or wire
  `backOnClick`.

## Header

- `logo` defaults to a hardcoded production CDN URL for the Chile brand logo, not
  a placeholder — forgetting to pass it ships the real Falabella Seguros Chile
  logo in any environment/locale. Storybook's `WithLogoCo`/`WithLogoPe` variants
  exist specifically to override this default.
- The step progress bar never reaches 100%: even when `current === total`, width
  is hardcoded to `"95%"` instead of the computed value.

## Icon

- `iconName` is a CSS mask class, not a file path (see SKILL.md).
- `circle` alone does nothing visually — the wrapper carrying the `icon--circle`
  class only renders when `bgColor` or `bgClassName` is also supplied.

## Input

- `labelText` defaults to `"Label Input"` — stays visible in production if not
  passed (see SKILL.md).
- `prefix` silently disables the icon feature entirely: if `prefix` has any
  length, the `showIcon`/`iconName`/`onClickIcon` branch isn't evaluated at all,
  regardless of those props being set.
- `errorText` defaults to hardcoded Spanish — `"Campo inválido"` — shown whenever
  `isValid={false}` without an explicit `errorText`.

## InputDate

- `defaultDate` reads like an uncontrolled "initial value" prop but is wired
  directly to `react-datepicker`'s controlled `selected` — there is no internal
  state. Unless the parent updates `defaultDate` itself on `onChange`, the
  calendar UI never reflects the picked date. Confirmed by the Storybook wrapper,
  which has to hand-roll its own `useState` to make selection "stick."
- `minDate`/`maxDate` both default to `new Date()` (today). Omitting them
  collapses the selectable range to a single day — any other date is silently
  swapped for today when `onChange` fires.

## InputDateLite

- `id` defaults to the hardcoded `"datepicker"`. Two instances on one page
  without explicit `id` collide (duplicate DOM id, shared `label htmlFor`).
- With the defaults (`initiallyMasked=true`, `maskChar="*"`), a pre-filled
  `selectedDate` renders partially masked (e.g. `**/01/2022`) and the field is
  read-only until the user focuses/clicks it to reveal/unmask.

## InputPlate

- `onGetCode` fires on mount (with an empty string) and on every keystroke — not
  on completion. The completion callback is the separate `onCompleteCode` prop.
- `reset` is a one-shot flag: leaving it `true` after clearing the fields
  permanently silences `onCompleteCode`, even once the user re-fills everything.
  Inputs stay typable while `reset===true`; only the completion callback is
  gated.

## Item

- `clickable` defaults to `true` and `onClick` defaults to a no-op. An Item
  rendered with only `title`/`description` silently becomes an
  interactive-looking card (`role="button"`, hardcoded green arrow-right
  affordance) that does nothing on click — pass `clickable={false}` explicitly
  for a static card.

## ListItem

- `OptionProps.type` is typed as a plain `string`, not a union of the 5 supported
  kinds. A typo (`"image"` instead of `"img"`) compiles fine and silently renders
  nothing for that option.
- Default checkbox/radio ids (`` check-${index} ``/`` radio-${index} ``) are only
  unique within one instance's own options array — every ListItem's first
  unlabelled checkbox becomes `id="check-0"` etc., colliding *across* instances
  on the same page, not just within one.
- `iconName` defaults to the literal string `"iconName"` (not empty) for
  icon/link option types — omitting it renders a broken icon with that bogus CSS
  class, with no warning.

## Loader

- The percentage-counting effect's dependency array only includes `duration`, not
  `showPercentage` — toggling `showPercentage` on an already-mounted Loader never
  starts the counter unless `duration` also changes or the component remounts.
- `showPercentage`'s readout is a pure client-side timer keyed off `duration`
  (seconds) — it is **not** wired to any real progress/loading state. It reaches
  and freezes at 100% after `duration` seconds even if the real operation is
  still in flight.

## PaymentMethod

- Hardcodes `name="payment"` (see SKILL.md — collides if 2+ instances render).
- The radio's `checked` state is fully derived from `checkedId === id`, with no
  `defaultChecked` fallback. Wiring only `onChange` (the intuitive move for a
  "radio button") leaves it permanently unchecked — the parent must track and
  feed back `checkedId` after every selection.

## ProductCard (and family: ProductCardFull, ProductCardRecommended, ProductCardSimple)

- `localMontlyPrice`, `showRecomended`/`recomendedText` are the real prop names
  (see SKILL.md misspelling table).
- **ProductCard**: the company logo block requires `companyLogo` **and**
  `companyName` both non-empty. Passing `companyLogo` alone renders no logo —
  `companyName` reads like decorative alt-text metadata but is actually a hard
  gate (it's also used in the `alt` attribute, which is its only other use).
- **ProductCardFull**: truncates far more than title/subtitle/discount/detail/
  benefits (already documented in SKILL.md) — also `recomendedText`/`priceText`/
  `discountLegalText`/`promoTagText` at 40 chars, `savings` at 32,
  `cardInfo[].title` at 45, and `benefits[].title` at 20 (a *different* field
  from the header's own `title`, despite sharing the number 20). 11 distinct
  truncation points total, each with its own limit.
- **ProductCardFull**: `showPromoTag` defaults to `true` and `promoTagText`
  defaults to a full hardcoded marketing sentence
  (`"¡No lo dudes, asegúrate hoy!"`) — a promo banner ships by default unless you
  explicitly turn it off.
- **ProductCardRecommended**: the "Recomendación" ribbon text and "Valor del
  plan" price label are hardcoded literals with no override prop — unlike the
  sibling `ProductCardFull`/`ProductCardSimple`, which expose
  `recomendedText`/`valueTag` for the same UI elements.
- **ProductCardSimple**: hardcodes `id="radio-input"` (see SKILL.md — collides).
  The `showCheck` radio additionally has no `name`, `onChange`, or `checked` prop
  at all — it's a bare uncontrolled native radio the parent cannot read or drive.

## QuantitySelector

- Fully controlled via `setState`-style dispatcher, not a simple callback (see
  SKILL.md).
- `name` (the native radio-group name) defaults to the literal `"quantity"`.
  Two instances on one page without distinct explicit `name` values share one
  radio group and silently steal each other's selection.

## RadioButton

- The visible label is supplied via `children` (not a `label`/`text` prop) and
  defaults to `"Lorem Ipsum"` if omitted — the opposite convention from `Button`
  in the same library, which does *not* accept `children` and requires `text`.

## Select

- `id` and `name` both default to the same hardcoded `"select"`. Two instances
  without explicit `id`/`name` collide on both (broken `label htmlFor`
  association, shared `name`).
- `labelText` defaults to `"Label Input"` — same trap as `Input`.
- `SelectProps` extends the full native `SelectHTMLAttributes`, so TypeScript
  accepts props like `multiple`, `size`, `onClick`, `tabIndex`, any `aria-*` —
  but the component destructures a fixed allowlist with no `...rest` spread, so
  anything outside that allowlist compiles but has zero runtime effect. (The
  library's own Storybook still documents a `size` argType that is never read.)

## SelectSearch

- `isClearable` is hardcoded to `false` on the underlying `react-select` and is
  not exposed as a prop — no way to add a clear/"×" button.
- `maxSelectedOptions` defaults to `7` in multi-select mode. At the limit,
  remaining unselected options become unclickable
  (`pointer-events: none` + disabled) with no visual explanation unless the
  caller explicitly overrides the prop.

## SelectableCard

- `children` defaults to `"Lorem Ipsum"` and renders visibly if omitted.

## Summary / SummaryDev

- Byte-identical duplicates of each other (see SKILL.md).
- The `alert` prop is a nested object (`AlertProps & {showAlert}`). Passing
  `alert.children`/`alert.type` alone does nothing — the Alert only renders if
  `alert.showAlert` is explicitly `true` (default `false`).
- In `productsList`, whether an item's price gets the `d-inline-block` layout
  class (to sit next to its payment-logo image) is decided by the **top-level**
  `paymentLogo` prop's length, not that item's own `product.paymentLogo`. A
  per-product logo with no top-level `paymentLogo` set renders with broken
  layout (logo not inline with price). Same bug in both the desktop and mobile
  bottom-bar blocks, in both files.

## Tab

- Exposes `scroll`, `scrollClick`, `scrollLeftClick`, `showLeftArrow`,
  `showRightArrow` — strongly implying built-in horizontal scrolling — but
  implements **zero** scroll behavior itself; it only toggles a CSS class. All
  overflow-detection, the actual `scrollTo()`, and arrow-visibility state must be
  implemented externally. The official Storybook story needs ~30 extra lines
  (refs, three `useState`s, manual scroll math, a resize listener) just to make
  it work.
- The click callback is named `actionAnchor`, not `onChange`/`onClick`/
  `onTabChange`, and receives the clicked tab's `idAnchor` string.

## Table

- Cells are `{ cell: ReactNode }` objects (see SKILL.md) — but `header` and
  `footer` items render as **raw** `ReactNode` children directly, not wrapped the
  same way. Wrapping them like data cells (`{cell: "Total"}`) throws "Objects are
  not valid as a React child."
- The "Sin Datos" empty-state row has no `colSpan` — with a multi-column header
  it only occupies the first column instead of spanning the table width.

## TextArea

- `labelText` defaults to `"Label Input"` — same trap as `Input`.
- The `maxLength` character counter reads only the `value` prop, not the DOM
  textarea's live content. Used uncontrolled (`defaultValue` without
  `value`/`onChange`), the counter stays frozen at `0 / N` regardless of what's
  typed.

## Tooltip

- `iconName`/`imgSrc` do **not** change the visible trigger icon — that's always
  the hardcoded exclamation/interrogation SVG chosen by `openTooltipIcon`.
  `iconName`/`imgSrc` only add an extra icon *inside* the popup bubble next to
  the text.
- `openTooltipIcon` is used as an object-lookup key with no fallback. Any value
  outside `"exclamation"`/`"interrogation"` (e.g. a dynamically built string that
  bypasses the TS union) throws a `TypeError` at render instead of degrading
  gracefully.

## Upload

- `id` and `name` both default to the hardcoded `"upload"` — two instances
  without explicit values collide on both. Every Storybook instance explicitly
  overrides both, implying the authors know this needs manual disambiguation.
- `required` defaults to `true` (not `false`, unlike sibling field components
  such as `TextArea`) — an untouched Upload blocks native form submission until
  a file is chosen.
- `capture` defaults to `"environment"`, hinting mobile browsers to open the
  camera directly rather than a generic file/gallery picker.
