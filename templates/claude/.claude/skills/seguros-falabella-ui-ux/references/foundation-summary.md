# Foundation Summary

This summary is derived from the Seguros Falabella shared foundations source used for colors, typography, grid, shadows, and containers.

## Color Foundations

The Figma file explicitly describes color usage in terms of hierarchy and permissible use.

### Neutral palette usage

- `Neutral 0` `#FFFFFF`: white base.
- `Neutral 5` `#F4F7F9`: very light backgrounds.
- `Neutral 10` `#E2E9EE`: decorative background emphasis and strokes.
- `Neutral 20` `#C3CDD8`: stronger decorative background support.
- `Neutral 80` `#333537`: primary text on white backgrounds.
- `Neutral 60` `#5E6267`: secondary text on white backgrounds.
- `Neutral 40` `#90979E`: tertiary text on white backgrounds.
- `Neutral 85` `#292A2C` and `Neutral 95` `#151616`: darker emphasis or deeper contrast zones.

### Explicit semantics from Figma

- Some colors are marked as **background decorativo**: they are complementary and should separate content or visual weights, not become the main interaction signal.
- Some colors are marked as **decorativo mínimo**: they may appear in backgrounds, illustrations, or non-dominant decorative elements, but should not be used for interactive elements.
- `Neutral 10` is explicitly used for borders and divider lines.

### Product palettes detected

The file separates product color families for product identity and emphasis:

- Movilidad: `Blueberry 60`, `Blueberry 10`, `Blueberry 5`
- Vida: `Raspberry 50`, `Raspberry 10`, `Raspberry 5`
- Salud: `Orange 10`, `Orange 5`
- Hogar: `Grape 60`, `Grape 10`, `Grape 5`
- Viajes: `Agave 50`, `Agave 10`, `Agave 5`

Use these product colors as emphasis or identity accents, not as a substitute for the neutral text hierarchy or for arbitrary CTA states.

### Accessibility rule

The Figma notes reference WCAG and W3C accessibility guidance. Preserve contrast and do not trade readability for brand saturation.

## Typography Foundations

The Figma file divides typography into page titles, section headings, paragraph text, labels, and input values.

### Titles and headings

- Titles are intended for page-level titles similar to `h1` and `h2`.
- Headings define sections inside a page, container, or table.
- Detected scale:
  - `title.md`: sizes 32 and 28 are shown in the page.
  - `heading.lg`: size 22.
  - `heading.md`: size 18.
  - `heading.section`: size 12.

### Paragraphs, labels, and inputs

- Paragraph scale shown in Figma:
  - `paragraph.lg`: size 20.
  - `paragraph.md`: size 18.
  - `paragraph.sm`: size 16.
- Labels are shown as primary and secondary variants across `lg`, `md`, `sm`, and `xs` roles.
- `input.value.md` appears at size 20.

Use typography to express hierarchy before adding more color, borders, or decoration.

## Spacing Rhythm

The typography page explicitly states a doubling rhythm for spacing.

Documented progression:

- `4`
- `8`
- `16`
- `32`
- `64`

Use these values as the default spacing language. Avoid arbitrary values unless the surrounding component system already defines them.

### Practical padding rules

- Mobile page padding: `24px` from the screen edge.
- Desktop outer margin: `64px` from the viewport edge to the main container.
- Standard internal surface padding: `24px`.
- Larger grouped surface padding: `32px`.
- Tight inline spacing: `8px`.
- Related content spacing: `16px`.
- Section separation inside a screen: `32px`.
- Major region separation: `40px` to `56px`.

Avoid mixing several near-identical values such as `20`, `22`, `26`, or `30` inside one screen unless an existing component already imposes them.

## Grid Foundations

The Figma grid page documents separate containers for desktop and mobile.

### Mobile

- Use `Container.sm.SF` for mobile.
- Minimum viewport reference shown: `375px`.
- Side padding shown: `24px`.
- Inner content width example shown: `327px`.

### Desktop

- Use `Container.lg.SF` for desktop.
- Desktop viewport reference shown: `1280px`.
- Max content width shown: `1152px`.
- Side margins shown: `64px`.
- A recurring example split uses a main area around `757px` and a secondary support area around `363px` inside the desktop container.

### Desktop OMNI variant

- A second desktop grid variant appears as `Container.lg.OMNI`.
- Desktop OMNI viewport reference shown: `1440px`.
- Max content width shown: `1120px`.
- The composition places the content container inside wider desktop margins than the standard Seguros grid.
- The same layout logic remains: one dominant content area plus one support area, with examples around `736 / 352` inside the OMNI container.

### Layout implications

- Desktop layouts commonly split content into wider primary columns and narrower support columns.
- Mobile layouts collapse into a tighter single-column or two-up structure with smaller inner gutters.
- Example spacing bands of `40px` and `56px` appear in the grid guidance and example compositions.
- Repeated examples show `40px` as a strong vertical band between major regions and `56px` under large structural bars or headers.

## Shadows and Elevation

The shared foundations include explicit elevation roles.

### Observed elevation roles

- `Base` / `Flat`: for informative surfaces and low-emphasis cards.
- `Shadow 100`: for fixed components that need to sit above surrounding content.
- `Shadow 100 invert`: for fixed components where the shadow direction supports a bottom-attached or inverse visual behavior.
- `Shadow 400`: reserved for modals or dialogs.

### Practical usage

- Informational cards should stay visually calm and usually remain `Flat` or `Base`.
- Interactive flow containers can elevate to `Shadow 100` when they need stronger separation from the page.
- Fixed UI pieces should not use modal elevation unless they are truly acting like an overlay.
- Dialogs and modal layers should use the strongest documented elevation instead of inventing custom shadow depths.

### Elevation restraint

- Do not stack multiple heavy shadows in the same viewport.
- Use spacing and border hierarchy first; use elevation only when it clarifies layering.
- A summary panel, card, and modal should not all compete with the same shadow intensity.

## Practical Translation

When in doubt:

1. Use neutral text and border colors first.
2. Use product colors as supporting emphasis.
3. Choose the typography role before choosing the color weight.
4. Use the x2 spacing rhythm before inventing a custom distance.
5. Start from the documented mobile and desktop containers before defining custom widths.
6. Start boxed content with `24px` padding and only scale up when the content density justifies it.
7. Prefer one dominant content column plus one support column on desktop over many equal-width columns.
8. Treat elevation as semantic layering: `Flat` for calm content, medium shadow for fixed or interactive surfaces, strongest shadow for dialogs only.