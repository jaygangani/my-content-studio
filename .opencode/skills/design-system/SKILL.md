---
name: design-system
description: Use when building or reviewing UI to match the house visual language — "match the design", "follow DESIGN.md", "is this on-brand", "spacing/typography looks off", "theme". Explains the monochrome token system, typography scale, spacing rhythm, and the hard no-no's (no accents, shadows, or gradients).
---

# Design system (DESIGN.md)

The app follows `DESIGN.md`: monochrome editorial, Runwai-derived. Photography
and type carry the design — not colour, shadow, or flourish.

## Token layers

| Layer        | File                     | What it holds                                         |
| ------------ | ------------------------ | ----------------------------------------------------- |
| Raw palette  | `src/index.css` `:root`  | CSS vars (`--primary`, `--foreground`, `--border`…), remapped in `.dark` |
| Brand theme  | `src/styles/theme.css`   | Tailwind v4 `@theme` — ink/graphite/slate/ash, hairline, canvas, radii, typography utilities |

There is **no `tailwind.config.js`** (Tailwind v4). New tokens are added in
`theme.css` (`@theme`) and, if they need light/dark values, as `:root` vars in
`index.css` mapped through `@theme inline`.

## Colour

Monochrome only. Reach for text tokens: `text-ink`, `text-ink-soft`,
`text-graphite`, `text-slate`, `text-ash`. Surfaces: `bg-canvas`,
`bg-background`, `bg-surface-cool`. Borders: `border-hairline`,
`border-hairline-soft`. Primary/actions stay black (`bg-primary`).

## Type + spacing

- Type utilities: `text-display`, `text-heading-lg|md|sm`, `eyebrow`,
  `micro-caps`, and body at `text-base`/`text-sm` with `text-graphite`.
- Vertical rhythm uses `section-y` between major blocks; page shells follow
  the `mx-auto w-full max-w-5xl px-6 py-16` pattern used in `Home`/`Apps`.
- Cards: `rounded-lg border-hairline bg-canvas p-0 shadow-none` with inner
  `px-8 pt-8` / `px-6` padding.

## Hard no-no's

- No accent colours, no gradients, no drop shadows.
- No raw hex values in components — always tokens.
- Buttons remain black pills (`rounded-full`); don't restyle the primitive.

## Reviewing

When asked to check fidelity, read `DESIGN.md`, compare against a sibling page
(Home/Apps), and cite the specific token that should replace any off-brand
value. Keep feedback concrete: file:line → token/pattern to use.
