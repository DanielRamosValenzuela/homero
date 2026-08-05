# Tomaco component inventory

> **NOT GENERATED YET.** This is the placeholder Homero ships.
>
> Generate the real inventory with:
>
> ```
> node scripts/homero/homero.mjs generate catalog --target .
> ```
>
> It reads the installed design-system package recorded at
> `product.designSystemPackage` in `homero.config.json` and replaces this file with
> the actual export list plus a provenance header.

## While this file is a placeholder

Do not treat its absence as evidence that a component does not exist. Fall through to
the remaining sources in `../SKILL.md`:

- the installed package under `node_modules/<designSystemPackage>`
- existing imports in this repo
- Code Connect mappings returned by `homero-figma`

If none of those confirm the component, say so and ask. Do not invent a component
name, prop, or token to fill the gap.

## Why this is generated, not hand-written

A hand-maintained component list goes stale on the design system's next release and
nothing announces it. The agent keeps citing components that no longer exist, with
full confidence. Generating it from the installed package means the inventory is
either current or visibly absent — never quietly wrong.
