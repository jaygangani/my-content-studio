# mycontentstudio — Agent Guide

Rules and conventions for agents working in this repository. Read this before
making changes. Keep it accurate: update it when the stack changes.

## What this is

A production-ready React SPA: **Vite + React 19 + TypeScript**, **Tailwind
CSS v4**, **shadcn/ui**, **React Router**, **Amplify Gen2** (auth, data,
storage), and a **PWA** service worker. The visual language follows
`DESIGN.md` (ElevenLabs-derived: off-white canvas, ink pills, light serif display).

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
   `ampx deploy`, `ampx pipeline-deploy`, `cdk deploy`, `npm run infra:*`,
   `npm run deploy:web`, `npm run backend:bootstrap`,
   `npm run backend:deploy:prod`, `npm run deploy:prod`,
   `npm run deploy-prod`, or any command that creates/updates cloud
   resources
   unless the user explicitly asks. Initialising/editing local
   `amplify/` files is fine. There is **no CI/pipeline configured**; the user
   deploys backend and frontend manually. Do not add deploy scripts or assume
   a pipeline exists. State clearly what any deploy would affect before it
   runs.
2. If AWS credentials are ever needed, the user uses
   `export AWS_PROFILE=jaygangani`. Claude Code sessions get it from
   `.claude/settings.json` (`env`); the profile name only, never keys. Never
   commit credentials or write them to files.
3. **Never commit secrets.** Never log tokens, keys, or `amplify_outputs.json`
   contents that contain live identifiers.
4. Do not add comments to code unless the user asks. JSDoc on exported
   public modules is the only exception; match existing style.
5. Follow `DESIGN.md`: off-white `canvas` floor, white `surface-card` cards
   with hairlines, no gradients on controls, display type is the serif at
   weight 300 (`text-display*`, `text-heading-*`), never bold. `primary` is
   the ink pill and the only action colour; no saturated accent. Buttons and
   badges are pills (`rounded-full`), cards `rounded-xl`, inputs `rounded-md`.
   Pastel `gradient-*` tokens are atmosphere only (`.orb` utilities), never
   fills for buttons, text or card surfaces. At most one soft shadow tier
   (`--shadow-soft`, hovered cards).
6. Do not edit `src/components/ui/*` primitives to change app behaviour;
   style at the usage site or via theme tokens.

7. Do not read or print `.env.local` or `amplify_outputs.json`; they hold
   live identifiers. Reference variable names only.
8. Do not `git push` or commit unless the user asks. Never add
   `Co-Authored-By` or any AI attribution trailer to commits or PR bodies.

## Agent tooling

- `CLAUDE.md` imports this file; keep rules here, not there.
- `.claude/settings.json` (shared) allows build/dev commands and denies
  `ampx`, `aws`, and reads of secret files; `git push` is not auto-allowed
  except `origin main` when the user asks. Personal overrides go
  in `.claude/settings.local.json` (git-ignored).
- Project skills live in `.opencode/skills/` (`add-page`, `amplify-data`,
  `design-system`, `shadcn-ui`); `.claude/skills` symlinks to it. Use them
  for the matching task instead of re-deriving patterns.
- `docs/` holds product specs (FRDs, content-format research). Read the
  relevant one before changing content generation behaviour.

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
    features/    domain components (AppLogo, AppConfigPanel, ProfilePanel,
                 ContentPanel, PiecePreview, PieceEditor)
  hooks/         useTheme, useThemeContext, useSwipe
  lib/           utils.ts (cn), amplify.ts (configure + dataClient),
                 overlayText.ts (overlay fonts, canvas text burn-in),
                 render.ts (frames + drawFrame, shared by preview/export),
                 profile.ts (min-field gate), export/ (mp4, png, zip, caption)
  pages/         Home, Apps, AppDetail, ContentDetail, Feed, AdminAssets, Login, NotFound
  routes/        index.tsx — lazy routes + ProtectedShell
  services/      apps.ts, profile.ts, content.ts (CRUD, generate,
                 regenerate, stock search, usage), assets.ts, storage.ts
                 (S3), http.ts
  types/         shared API/content/profile/script/theme types
scripts/         build-formats.ts (docs 72-formats md → seed-data/formats.json),
                 seed-formats.ts (writes formats + prompts to DynamoDB),
                 seed-data/ (formats.json, format-overrides.json, prompts.json),
                 deploy.mjs + write-env-deploy.mjs (S3/CloudFront),
                 backend-bootstrap.sh + backend-deploy.sh (prod backend)
infra/           CDK stack for web hosting (own package.json)
  context/       React context providers
  styles/        theme.css (DESIGN.md tokens via @theme) + globals; fonts: Inter
                 (body) + Newsreader (Waldenburg substitute, display)
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
  (`auth`, `data` with the `Apps`/`AppProfile`/`Content` models etc., `storage` `media/*`,
  function `generate-content`). `amplify_outputs.json` is generated/refreshed
  only by deploy/sandbox.
- **Content generation (Lambda + HTTP API)** — function
  `amplify/functions/generate-content/` (in `defineBackend`, **not** AppSync).
  One Lambda behind an API Gateway **HTTP API** with a **Cognito User Pool
  JWT authorizer**; routes `POST /content/generate`, `/content/regenerate`,
  `/content/stock-search`. Base URL is in `amplify_outputs.json` →
  `custom.GENERATE_CONTENT_API_URL`; frontend calls live in
  `src/services/content.ts`. **Formats and prompt wording are data, not code:**
  the `FormatDef` and `PromptSnippet` tables hold the 72 formats, the meme and
  viral rows (`kind` meme/viral selects the pipeline) and every AI text
  (system prompt, addendum, meme/viral prompts, carousel/image rules, layout
  and style rules). Admins edit them at `/admin/formats`; `store.ts` loads
  them with a 60 s cache and fails with a 503 "not seeded" when empty.
  `POST /content/test-generate` (admin) runs one format without saving;
  `POST /content/draft-format` (admin) turns a free-text description into a
  filled format form using the `admin.format_draft` prompt snippet.
  Seed once with `npm run seed:formats` (only when the user asks; reads
  `scripts/seed-data/`, insert-only unless `--overwrite`). Modules:
  `catalog.ts` (types, input gating, picks), `store.ts` (DB loaders),
  `schemas.ts` (strict JSON schemas), `validate.ts` (FR-3.4 checks +
  invented-fact check), `stock.ts` (Pexels), `openai.ts`, `handler.ts`
  (pipeline: profile gate → daily limit → pick → prompt → validate/retry/skip
  → stock → write). Regenerate `scripts/seed-data/formats.json` with
  `npx tsx scripts/build-formats.ts` after editing
  `docs/72-short-form-content-formats (2).md`, then seed with `--overwrite`
  if you want the docs to replace admin edits. The Lambda sets `owner`
  (`sub::username` from the JWT) on every row it writes, otherwise
  `allow.owner()` hides it from the user. Limit is 5 per app per
  user-local day (`DailyUsage`, id `appId#YYYY-MM-DD`); members of the Cognito
  `admin` group (`defineAuth` `groups`) have no limit — the Lambda reads
  `cognito:groups` from the JWT. **SSM params:**
  `OPENAI_API_KEY_PARAM` (`/mycontentstudio/openai/api-key`) and
  `PEXELS_API_KEY_PARAM` (`/mycontentstudio/pexels/api-key`); model is env
  `OPENAI_MODEL` (default `gpt-4o-mini`). Create both parameters before
  running. No deploy without user ask.
- **Data model** — `Apps`, `AppProfile` (structured JSON: personas, features,
  voice, proof, competitors, brand, storeUrl, ctaText), `Content` (a piece:
  status `DRAFT|APPROVED|DISCARDED`, `formatId`, `igFormat`, `personaId`,
  `featureId`, `pillar`, `scriptJson`, `regenCount`, `approvedAt`; legacy
  overlay/video/audio fields are unused), `Asset` (stock media with source +
  licence per beat), `GenerationLog`, `DailyUsage`. All use `allow.owner()`.
- **Carousels + brand kit** — `AppProfile.brand` (JSON) holds the brand kit:
  3 colours, headline/body fonts (`BRAND_FONTS` in `src/lib/brand.ts`), logo
  light/dark keys (optional), show-logo toggle, logo corner, one visual style per app
  (`bold-minimal`, `warm-editorial`, `tech-clean`). Carousel formats are
  ineligible in the Lambda until the kit is complete (`readBrandKit`).
  Branded slides are painted by `paintCarouselSlide` in `src/lib/carousel.ts`
  (1080x1350, 80px margins, logo corner, no pagination, typography-first; visual types
  typography/icon/data/screenshot/stock) through `Frame.paint` /
  `paintFrame` in `render.ts`, so preview and PNG export match. Brand logos
  and feature screenshots are S3 keys under `media/brand/` and
  `media/screenshots/`, resolved by `useBrandAssets`. `runCarouselQa`
  (`src/lib/carouselQa.ts`) feeds the warn-only checklist. Carousel payloads
  without `visual_type` render with the legacy photo + text path. Stock photos are policy-driven per format
  (`stockPolicy` on the format in `/admin/formats`, default `never`; see
  `docs/carousel-visual-strategy.md`). Carousel layout is the format's
  `variant` (15 layouts in `src/lib/carouselLayouts.ts`, listed in that doc),
  with matching prompt rules in the `layout.<variant>` prompt snippets.
- **Single image posts** — brand-kit styled like carousels when the piece has
  `bgScheme` (set by the Lambda; older pieces without it keep the legacy dark
  overlay). Painted by `paintImagePost` in `src/lib/imagePost.ts` through
  `Frame.paint` (1080x1350, same `paletteFor` schemes, logo corner and fonts as
  carousels). Layout is chosen by `formatId` for the special memes (Nobody,
  notifications, fake post, bell curve, Venn) and otherwise by the format
  `layout` (`card`, `columns`, `stack`, `grid`). Brand kit is required to
  generate them. Photos follow `stockPolicy` per format
  (set in `/admin/formats`, default `never`).
- **Meme reels (green screen)** — a `REEL` script with `payload.meme`
  (`MemePayload` in `src/types/script.ts`, `isMemeScript`). Three layers:
  background (stock photo / solid / brand colour), a stock green screen video
  chroma-keyed live in the browser (`src/lib/chromaKey.ts`, key colour is
  admin-set per video), and one AI text block (3 line variants). Painted by
  `paintMeme` in `src/lib/meme.ts`, shared by `MemePreview` and
  `exportMemeReel` (`src/lib/export/meme.ts`, loops the clip to 5-30s and
  mixes its audio as AAC when the browser can). Library = `GreenScreenVideo`
  model (`title`, `keywords`, `videoKey` under `media/greenscreen/`,
  `keyColor`), read by every user, written by the Cognito `admin` group via
  `/admin/assets`. Per-app defaults live in `AppProfile.memeConfig`
  (Configurations tab, `MemeConfigPanel`). Lambda: pseudo format id 9001
  (`kind: meme` row in `FormatDef`), video picked in code (random, avoids recent
  picks, honours `blockedVideoIds`), compact `MEME_SCHEMA` prompt, same
  profile gate and daily limit. Generate with `reelKind: 'meme'` or via
  "Surprise me".
- **Viral clip reels** — a `REEL` script with `payload.viral` (`ViralPayload`,
  `isViralScript`): a black header with one tweet-style line and a stock viral
  video full width under it, played once (max 30s) with its audio. Painted by
  `paintViral` in `src/lib/viral.ts`, shared by `ViralPreview` and
  `exportViralReel` (`src/lib/export/viral.ts`; audio helpers in
  `src/lib/export/audio.ts`). Library = `ViralVideo` model (`title`,
  `keywords`, `videoKey` under `media/viral/`, `durationSeconds`), managed in
  the Viral clips tab of `/admin/assets`. Per-app block list and sound live in
  `AppProfile.viralConfig` (`ViralConfigPanel`). Lambda: pseudo format id 9002
  (`viral: true`), clip picked in code (random, avoids recent picks), compact
  prompt from clip title and keywords, 3 line variants.
- **Review + export** — `/feed` is the swipe feed (drafts across apps, `?app=`
  filter). Approve = `status: APPROVED`; discard deletes the piece and its
  assets. `PiecePreview` and the exporters both draw through
  `drawFrame` in `src/lib/render.ts` — change that one function, never one
  side. Export runs in the browser: Reel → silent 1080×1920 H.264 MP4
  (WebCodecs + `mp4-muxer`), carousel/story → PNGs in a ZIP (`jszip`), image →
  one PNG. Only approved pieces export.
- **Hosting** — `amplify.yml` (repo root) is the **Amplify Hosting** build
  spec: `npm ci` → `npm run build`, artifacts from `dist/`, SPA rewrite of
  extensionless paths to `/index.html`, plus cache/header rules. Static SPA
  only — the Amplify backend (auth/data/storage) is untouched by hosting.
  Web hosting on S3 + CloudFront is user-added: CDK stack in `infra/`, deploy
  script `scripts/deploy.mjs` (`npm run deploy:web`, `deploy:web:dry`), config
  in git-ignored `.env.deploy` (see `.env.deploy.example`, `infra/README.md`).
  The production backend is deployed from the CLI, MyCustomer-style:
  `npm run backend:bootstrap` then `npm run backend:deploy:prod` (writes
  `outputs/main/amplify_outputs.json`; `deploy:web` swaps it in for the
  build and restores the local file). Run these only when the user asks, dry
  run first.
  Connect a branch in the Amplify console to use it; set the `VITE_*` env vars
  there (they are baked in at build). Deploys are manual (see Hard rules) —
  never run `ampx` commands or push unprompted.
- **Overlay text styling** — text is drawn by `drawOverlay` in
  `src/lib/overlayText.ts` using the style catalogs in `src/types/content.ts`
  (`DEFAULT_OVERLAY_STYLE`). `geist` is bundled; the other catalog fonts load
  from Google Fonts on demand and are awaited via `ensureOverlayFonts()`
  before any render or export.
- **PWA** — `vite-plugin-pwa` generates `sw.js` + `manifest.webmanifest` at
  build. The app registers the SW in `src/main.tsx`.
- **Env vars** — only `VITE_*` vars reach the client. The app no longer
  reads any; `VITE_PEXELS_API_KEY` and `VITE_JAMENDO_CLIENT_ID` in
  `.env.local` are unused and can be removed. Secrets live in SSM, read by
  the Lambda.

## Definition of done

- `npm run build` passes with zero TS errors.
- No unused imports/locals (strict `noUnusedLocals`/`noUnusedParameters`).
- New UI matches `DESIGN.md` tokens and existing spacing rhythm.
- If you touched `amplify/`, do **not** deploy; state what a deploy would do.
