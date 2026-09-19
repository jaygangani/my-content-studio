---
name: add-page
description: Use when adding a new routed page or screen to this app — "add a page", "new route", "create a screen", "add a settings/team/billing page", "/dashboard route", or extending navigation. Covers the lazy-route + ProtectedShell pattern, page component scaffolding with design tokens, and header links.
---

# Add a routed page

Routes live in `src/routes/index.tsx`; pages live in `src/pages/`. Follow the
existing Home/Apps pages exactly — do not invent a different structure.

## Steps

1. **Create the page** at `src/pages/<Name>.tsx` with a named export:

   ```tsx
   import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

   export function SettingsPage() {
     return (
       <section className="mx-auto w-full max-w-5xl px-6 py-16">
         <p className="eyebrow text-slate">Workspace</p>
         <h1 className="text-heading-lg text-ink">Settings</h1>
         <Card className="mt-12 rounded-lg border-hairline bg-canvas p-0 shadow-none">
           <CardHeader className="px-8 pt-8">
             <CardTitle className="text-heading-sm">Coming soon</CardTitle>
             <CardDescription className="text-base text-graphite">
               This section is under construction.
             </CardDescription>
           </CardHeader>
         </Card>
       </section>
     )
   }
   ```

2. **Register a lazy route** in `src/routes/index.tsx`. Keep the existing
   `lazy()` pattern and add the `<Route>` under the `ProtectedShell` branch
   (private) or as a top-level sibling (public, like `/login`):

   ```tsx
   const SettingsPage = lazyRoute(() =>
     import('@/pages/Settings').then((m) => ({ default: m.SettingsPage })),
   )
   // ...
   <Route element={<ProtectedShell />}>
     <Route path="/home" element={<HomePage />} />
     <Route path="/apps" element={<AppsPage />} />
     <Route path="/settings" element={<SettingsPage />} />
   </Route>
   ```

3. **Link it** from `src/components/common/AppHeader.tsx` using `<NavLink>`
   so active state styling matches the existing Home/Apps links.

4. **Verify**: run `npm run build` — it typechecks (`tsc -b`) then builds.
   Fix unused imports/locals (strict config).

## Rules

- Page components use **named exports**; only route shims use `default`.
- Private pages **must** sit inside `<ProtectedShell />`; never render a page
  that needs auth outside it.
- Do not add early auth redirects in pages. `ProtectedShell` already handles
  auth via `authStatus`; while `'configuring'` it renders nothing so the
  session restores before any redirect (this preserves the path on reload).
- Import via `@/...` only — no relative `../` imports.
- Use theme tokens (`text-ink`, `text-graphite`, `border-hairline`,
  `bg-canvas`, `text-heading-*`, `eyebrow`, `section-y`) instead of raw hex or
  arbitrary values. See `DESIGN.md`.
