# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

All project rules, commands, conventions, and architecture live in `AGENTS.md`
(shared with other agents) — it is the source of truth. Visual rules live in
`DESIGN.md`.

@AGENTS.md

## Additions for Claude Code

- **Verify with `npm run build`** — the only check. No lint, no tests; do not
  invent commands for them.
- **No AWS side effects.** Never run `ampx sandbox`/`deploy`/`pipeline-deploy`
  or push unless the user explicitly asks in this session. Editing `amplify/`
  locally is fine; afterwards, say what a deploy would change.
- **Route map** (`src/routes/index.tsx`, all under `ProtectedShell` except
  `/login`): `/apps` → `/apps/:appId` (Content / Profile / Configurations
  tabs) → `/apps/:appId/content/:contentId` (preview, caption, export), plus
  `/feed` (swipe review across apps).
- **Source of truth for the feature** is `docs/frd-per-app-content-generation.md`.
- `AGENTS.md`'s layout section can lag behind the code — trust the filesystem,
  and update `AGENTS.md` (not this file) when the stack or layout changes.
