# mycontentstudio — Agent Guide

Rules and conventions for agents working in this repository. Read this before
making changes. Keep it accurate: update it when the stack changes.

## What this is

A production-ready React SPA: **Vite + React 19 + TypeScript**, **Tailwind
CSS v4**, **shadcn/ui**, **React Router**, **Amplify Gen2** (auth, data,
storage), and a **PWA** service worker. The visual language follows
`DESIGN.md` (Runwai-derived, monochrome editorial).

## Commands

| Task            | Command                                                        |
| --------------- | -------------------------------------------------------------- |
| Dev server      | `npm run dev`                                                  |
| Typecheck+build | `npm run build` (`tsc -b && vite build`)                       |
| Preview build   | `npm run preview`                                              |
| Add shadcn ui   | `npx shadcn@latest add <name> -o -y`                           |
| Amplify backend | `npx ampx sandbox` — **only when the user explicitly asks**    |

- Always run `npm run build` after code changes; it typechecks first (`tsc -b`).
- There is **no lint or test runner configured**. Do not invent lint/test
  commands; if you add one, wire it into `package.json` and document it here.

## Hard rules (do not violate)

1. **Never deploy or push to AWS on your own initiative.** No `ampx sandbox`,
   `ampx deploy`, `ampx pipeline-deploy`, or any command that creates/updates
   cloud resources unless the user explicitly asks. Initialising/editing local
   `amplify/` files is fine. There is **no CI/pipeline configured**; the user
   deploys backend and frontend manually. Do not add deploy scripts or assume
   a pipeline exists. State clearly what any deploy would affect before it
   runs.
2. If AWS credentials are ever needed, the user uses
   `export AWS_PROFILE=jaygangani`. Never commit credentials or write them to
   files.
3. **Never commit secrets.** Never log tokens, keys, or `amplify_outputs.json`
   contents that contain live identifiers.
4. Do not add comments to code unless the user asks. JSDoc on exported
   public modules is the only exception; match existing style.
5. Do not introduce accent colours, drop shadows, or gradients — see
   `DESIGN.md` (monochrome + photography only). Buttons stay black pills.
6. Do not edit `src/components/ui/*` primitives to change app behaviour;
   style at the usage site or via theme tokens.

## Conventions

- **Path alias:** always import via `@/...` (maps to `src/`). No relative
  `../../` imports inside `src/` except `@/lib/amplify.ts` referencing the
  root `amplify_outputs.json` and `amplify/data/resource`.
- **Exports:** named exports for components/hooks/services
  (`export function HomePage`). Default export only for `App` and lazy route
  shims.
- **Types:** strict TS, `verbatimModuleSyntax` is on — use
  `import type { X }` for type-only imports. No `any`.
- **Styling:** use the `cn()` helper from `@/lib/utils` for conditional
  classes. Use theme tokens (`bg-primary`, `text-graphite`, `rounded-lg`,
  `text-display`, `eyebrow`, …), not raw hex values, in components.
- **Components:** keep them modular and single-responsibility; extract logic
  to hooks in `src/hooks/`; put global state in `src/context/`.
- **Data/API:** all backend calls live in `src/services/`. Components never
  call `dataClient`/storage directly.

## Project layout

```
src/
  assets/        images + favicons (public/ mirrors favicon_io + manifest)
  components/
    ui/          shadcn primitives (generated — do not hand-edit)
    common/      app shell: AppHeader
    features/    domain components (e.g. AppLogo)
  hooks/         useTheme, useThemeContext
  lib/           utils.ts (cn), amplify.ts (configure + dataClient)
  pages/         Home, Apps, Login, NotFound
  routes/        index.tsx — lazy routes + ProtectedShell
  services/      apps.ts (CRUD), storage.ts (S3), http.ts
  types/         shared API/theme types
  context/       React context providers
  styles/        theme.css (DESIGN.md tokens via @theme) + globals
```

## Stack specifics

- **Tailwind v4** — there is **no `tailwind.config.js`**. Tokens live in
  `src/styles/theme.css` (`@theme`) and `src/index.css` (`:root` CSS vars
  mapped with `@theme inline`). Add new design tokens there.
- **shadcn** — `components.json` uses the `radix-nova` style, `cn` from
  `@/lib/utils`, icons `lucide-react`. Add primitives with the CLI.
- **Routing** — `src/routes/index.tsx`: routes are `React.lazy()` +
  `<Suspense>` in `App.tsx`. Private pages live under `ProtectedShell`;
  `/login` is public. Auth state comes from
  `useAuthenticator((c) => [c.authStatus])`; while `'configuring'` render
  nothing (do not redirect early — it drops the user's path on reload).
  Unauthenticated redirects pass `state.from`; `LoginPage` returns there.
- **Amplify** — `src/lib/amplify.ts` runs `Amplify.configure(amplify_outputs.json)`
  and exports the typed `dataClient`. Backend is defined in `amplify/`
  (`auth`, `data` with the `Apps` model, `storage` `media/*`).
  `amplify_outputs.json` is generated/refreshed only by deploy/sandbox.
- **Hosting** — `amplify.yml` (repo root) is the **Amplify Hosting** build
  spec: `npm ci` → `npm run build`, artifacts from `dist/`, SPA rewrite of
  extensionless paths to `/index.html`, plus cache/header rules. Static SPA
  only — the Amplify backend (auth/data/storage) is untouched by hosting.
  Connect a branch in the Amplify console to use it; set the `VITE_*` env vars
  there (they are baked in at build). Deploys are manual (see Hard rules) —
  never run `ampx` commands or push unprompted.
- **PWA** — `vite-plugin-pwa` generates `sw.js` + `manifest.webmanifest` at
  build. The app registers the SW in `src/main.tsx`.
- **Env vars** — only `VITE_*` vars reach the client. `VITE_PEXELS_API_KEY`
  (video search, `src/services/pexels.ts`) and `VITE_JAMENDO_CLIENT_ID` (music
  search, `src/services/music.ts`) live in `.env.local` (git-ignored) and power
  the content render screen. They are exposed in the browser bundle; never put
  other secrets in `VITE_*`.

## Definition of done

- `npm run build` passes with zero TS errors.
- No unused imports/locals (strict `noUnusedLocals`/`noUnusedParameters`).
- New UI matches `DESIGN.md` tokens and existing spacing rhythm.
- If you touched `amplify/`, do **not** deploy; state what a deploy would do.
