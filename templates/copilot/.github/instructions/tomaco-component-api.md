# Tomaco component inventory

> **NOT GENERATED YET.** This is the placeholder Homero ships.
>
> `homero init` and `homero upgrade` generate the real inventory automatically when
> the design-system package is already in `node_modules`. Seeing this text means it
> was not — most likely Homero was installed before the first dependency install (npm/pnpm/yarn install).
>
> Generate it now:
>
> ```
> node scripts/homero/homero.mjs generate catalog --target .
> ```
>
> It reads the package recorded at `product.designSystemPackage` in
> `homero.config.json` and replaces this file with the real component list —
> categories, descriptions and keywords — plus a provenance header. Once generated,
> `homero upgrade` never overwrites it.

## While this file is a placeholder

Do not treat its absence as evidence that a component does not exist. Fall through to
the remaining sources in `.github/instructions/tomaco-design-system.instructions.md`:

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
