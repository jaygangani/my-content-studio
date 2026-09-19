---
name: shadcn-ui
description: Use when adding or styling UI in this app — "add a dialog/table/select/form", "install a shadcn component", "style this button/input", "use the design system". Covers the radix-nova shadcn CLI, the cn() helper, and DESIGN.md token rules (black pills, hairlines, no shadows or accents).
---

# shadcn/ui + design tokens

This project uses **shadcn/ui** (CLI preset in `components.json`, style
`radix-nova`) on top of **Tailwind v4**. Primitives live in
`src/components/ui/` and are generated — treat them as vendor code.

## Adding a primitive

```bash
npx shadcn@latest add dialog -o -y
```

- Use `-o` (overwrite) and `-y` (no prompt) so the command is non-interactive.
- Add only what you need; then import from `@/components/ui/<name>`.
- Import components at the **usage site**; do not fork or hand-edit the
  primitive to change app behaviour. Style via `className` at the call site or
  via theme tokens.

## Styling rules (from `DESIGN.md`)

- Conditional classes go through `cn()` from `@/lib/utils`:

  ```tsx
  import { cn } from '@/lib/utils'
  <div className={cn('rounded-lg border-hairline', isActive && 'bg-surface-cool')} />
  ```

- Prefer tokens: `bg-canvas`, `bg-background`, `text-ink`, `text-ink-soft`,
  `text-graphite`, `text-slate`, `text-ash`, `border-hairline`,
  `border-hairline-soft`, `bg-surface-cool`, `rounded-xs|sm|md|lg`.
- Typography utilities: `text-display`, `text-heading-lg|md|sm`, `eyebrow`,
  `micro-caps`, `section-y`.
- Buttons are **black pills** (`rounded-full`, `h-10 px-6`, `font-semibold`) —
  the `Button` primitive already does this. Keep it.
- **Never** add accent colours, gradients, or drop shadows. Cards use
  `shadow-none` with hairline borders (see `Apps.tsx`).

## Icons

`lucide-react` is installed; import named icons (`import { MoreVertical } from 'lucide-react'`).
Size with `className="size-4"` (or `size-5`), not width/height attributes.

## Verify

Run `npm run build` after editing UI. Avoid raw hex values — they will not
survive a theme change and violate `DESIGN.md`.
