# FRD: Per-App Content Generation

*My Content Engine · Functional Requirements Document · Version 1.0 draft · 11 Oct 2026*

## 1. Purpose and scope

This document defines what the per-app content feature must do. A user who owns several apps opens an app, fills in its profile once, and then generates short-form Instagram content for it one piece at a time. Each piece is reviewed in a swipe feed, edited if needed, approved or discarded, and exported as a file.

**In scope**

- App Profile form (the data the AI needs per app).
- One-click generation of a single piece of content from any of the 72 formats.
- Review by swipe (approve or discard), with editing of text, stock media and timing, and whole-piece regeneration.
- In-browser preview and export of approved content as MP4 or image files.
- A daily generation limit of 5 pieces per app.

**Out of scope for this version**

- Posting, drafting or scheduling on Instagram (approved content is download only).
- Audio of any kind (Reels export silent).
- Automatic daily generation.
- Shot or AI-generated video. Visuals are app screen recordings, stock video and images, and text templates only.
- Prompt-based editing, performance learning from post results, other social platforms, multi-user or SaaS use.

## 2. Existing system and assumptions

**Already built:** authentication, and users can add apps with name, description, logo and similar fields. This feature extends the app record with a profile and a Content area.

**Assumptions to confirm** (carried over from earlier planning, which was restarted):

- Single user with multiple apps. Web only, mobile-responsive.
- Stack: Amplify Gen2 backend, React frontend, OpenAI API for text generation.
- Stock video and images come from free stock APIs (for example Pexels or Pixabay). Licence terms must allow commercial use.

## 3. Decision summary

| Topic | Decision |
| --- | --- |
| Formats in v1 | All 72 formats from the format strategy doc |
| App profile input | Manual form filled by the user |
| Generation trigger | On-demand Generate button only |
| Pieces per click | Exactly one |
| Format selection | Random from all 72 |
| What the user chooses at generation | Nothing |
| Review experience | Swipe feed, right to approve, left to discard |
| Editing in review | Text and wording, swap stock clip or image, timing and duration, regenerate whole piece |
| Rendering and export | In the browser (preview and export) |
| After approval | Download only (MP4 or images) |
| Audio | None, silent export |
| Meme visuals | Stock images and clips only |
| Daily limit | 5 generations per app per day |

## 4. User flow

1. The user opens **Apps**, selects an app, and completes the **Profile** tab (once, editable any time).
2. In the app's **Content** tab the user taps **Generate**.
3. The system picks a format, builds the prompt, calls the AI, validates the result, fetches stock media and creates a draft.
4. The draft appears in the **swipe feed** with a live preview.
5. The user may open **Edit** to change text, stock media or timing, or tap **Regenerate**.
6. Swipe right to **approve**, swipe left to **discard**.
7. Approved pieces appear in the app's **Approved** list, where the user can **export** the files.

## 5. Functional requirements

Priority: **M** = must have, **S** = should have.

### 5.1 App Profile

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-1.1 | Each app has a Profile tab with a form. The existing name, description and logo are shown and editable there. | M |
| FR-1.2 | **Personas** (1 to 4): name, pain, desired result, words they use, daily moments. | M |
| FR-1.3 | **Features** (1 to 10): name, one-line benefit, optional screenshot or screen recording. | M |
| FR-1.4 | **Voice:** tone, words to use, banned words, claims that must never be made. | M |
| FR-1.5 | **Proof (optional):** real reviews, real user comments, stats (each with source and date), milestones with dates, offers (with claim rule and deadline). | M |
| FR-1.6 | **Competitors (optional):** names and known user complaints. | S |
| FR-1.7 | **Brand:** primary colours, font choice, logo. | S |
| FR-1.8 | **Store link and CTA wording** (for example "Search [APP]"). | M |
| FR-1.9 | Generation is blocked until the minimum fields are filled: description, at least one persona, at least one feature, voice tone, CTA wording. The user sees which fields are missing. | M |
| FR-1.10 | The profile is saved as structured JSON and sent to the AI with every generation. | M |

### 5.2 Generating content

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-2.1 | The Content tab shows a **Generate** button and the number of generations left today for this app (limit 5). | M |
| FR-2.2 | One tap creates exactly one draft. The user cannot choose format, persona or pillar. | M |
| FR-2.3 | The system picks the format randomly from the 72-format catalog. It also picks a persona, a feature and a pillar (Pain, How-to, Result, Myth or Identity) from the profile. | M |
| FR-2.4 | If the AI returns a skip because a required fact is missing (for example a review for the Real Review format), the system draws a different format and tries again, up to 3 times. | M |
| FR-2.5 | When the daily limit is reached, the button is disabled and shows when it resets. | M |
| FR-2.6 | While generating, the user sees progress. Generation can fail; failures show a clear message and a retry option and do not leave a half-built draft. | M |
| FR-2.7 | Generation stores which format, persona, pillar and feature were used, so each draft can be traced and regenerated. | M |

### 5.3 Generation pipeline

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-3.1 | Prompts are assembled from the shared system prompt, the format's own prompt template and the app profile. The 72 format prompts come from the format strategy doc. | M |
| FR-3.2 | The AI returns JSON only, in one of four schemas chosen by the format's Instagram format: Reel, Carousel, Single image or Story. | M |
| FR-3.3 | The AI writes text only. Stock media is fetched in code from the visual queries the AI returns. | M |
| FR-3.4 | **Validation before showing a draft:** valid schema; hook at most 8 words; beat or slide lines 5-10 words; Reel total length 15-30 seconds; hashtags and caption present; no banned words from the profile. A failed check triggers one automatic retry. | M |
| FR-3.5 | **No invented facts.** Stats, reviews, comments, offers and milestones may only come from the profile. Output that contains numbers or quotes not found in the profile is rejected. | M |
| FR-3.6 | Stock media is fetched in portrait orientation, long enough for its beat, and from sources whose licence allows commercial use. The source and licence of every asset are stored. | M |
| FR-3.7 | If no suitable stock result is found for a query, the system retries with a broader query before failing. | S |
| FR-3.8 | Every AI call is logged (format, tokens, cost, duration, outcome). | S |

### 5.4 Format catalog

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-4.1 | The 72 formats are stored as data, not code. Each has: number, name, group, primary Instagram format, repost option, structure, hook patterns, visual direction, CTA style, share trigger, prompt template, schema type and required inputs. | M |
| FR-4.2 | The primary Instagram format split is 30 Reels, 26 carousels, 14 single images and 2 Stories. | M |
| FR-4.3 | Formats that need real input are flagged with their required profile fields (for example #30 stats, #52 comments, #53 reviews, #54 milestones, #56 offers, #59 news). | M |
| FR-4.4 | Adding or editing a format must not require a code change to the generation pipeline. | S |

### 5.5 Review feed

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-5.1 | New drafts appear in a full-screen swipe feed, one piece at a time, with the app name and logo, the format name, the Instagram format, and a live preview. | M |
| FR-5.2 | Swipe right (or tap Approve) marks the piece as approved. Swipe left (or tap Discard) discards it. Buttons exist as an alternative to swiping. | M |
| FR-5.3 | Reels play as a looping preview. Carousels can be swiped slide by slide inside the card. | M |
| FR-5.4 | The caption and hashtags are shown with the piece and are editable. | M |
| FR-5.5 | A discarded piece is removed from the feed and from the app's lists. | M |
| FR-5.6 | The feed works on mobile browsers (touch swipe) and desktop (buttons and keyboard arrows). | M |

### 5.6 Editing

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-6.1 | **Text and wording:** every visible text element (hook, beats, slides, lines, CTA, caption, hashtags) can be edited, and the preview updates immediately. | M |
| FR-6.2 | **Swap stock clip or image:** the user can open alternatives for any beat or slide (more results for the same query, or a new search term) and pick one. | M |
| FR-6.3 | **Timing and duration:** for Reels, the user can change how long each beat shows. The total stays within the allowed range and the preview updates. | M |
| FR-6.4 | **Regenerate whole piece:** produces a new draft from the same format, persona, pillar and feature. The previous version is replaced. | M |
| FR-6.5 | Edits are saved as part of the draft, so leaving and returning keeps them. | M |
| FR-6.6 | Text must stay within safe areas and remain readable over the media. The editor warns when text overflows. | S |

### 5.7 Preview, rendering and export

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-7.1 | Preview and export both run in the browser. No server-side video rendering. | M |
| FR-7.2 | **Reel** exports as a silent MP4, 1080 x 1920 (9:16). | M |
| FR-7.3 | **Carousel** exports as one PNG per slide, 1080 x 1350 (4:5), downloaded together as a ZIP. | M |
| FR-7.4 | **Single image** exports as one PNG, 1080 x 1350 (4:5). | M |
| FR-7.5 | **Story** exports as one 1080 x 1920 image per frame. Sticker suggestions (poll, quiz, question, slider) are shown as text for the user to add in Instagram. | M |
| FR-7.6 | Each export includes the caption and hashtags as a copyable text block and a downloadable text file. | M |
| FR-7.7 | Only approved pieces can be exported. Export shows progress and works on current desktop browsers; mobile export is best effort. | M |
| FR-7.8 | File names include app, format number and date. | S |

### 5.8 Content lists

| ID | Requirement | Priority |
| --- | --- | --- |
| FR-8.1 | The app's Content tab shows **Drafts** (waiting for review) and **Approved** pieces. | M |
| FR-8.2 | Each item shows a thumbnail, format name, Instagram format, creation date and approval date. | M |
| FR-8.3 | The user can open any approved piece to re-export it. | M |
| FR-8.4 | Drafts that have not been reviewed stay in the feed until swiped. | M |

## 6. Data model

| Entity | Key fields |
| --- | --- |
| App (existing) | id, owner, name, description, logo |
| AppProfile | appId, personas[], features[], voice, proof (reviews, comments, stats, milestones, offers), competitors[], brand, storeUrl, ctaText |
| Format (catalog) | id 1-72, name, group, igFormat, repostAs, structure, hooks[], visual, cta, shareTrigger, promptTemplate, schemaType, requiredInputs[] |
| ContentPiece | id, appId, formatId, personaId, pillar, featureId, status (draft, approved, discarded), scriptJson, assets[], caption, hashtags[], regenCount, createdAt, approvedAt |
| Asset | id, pieceId, source, sourceUrl, licence, type (video or image), beatIndex |
| GenerationLog | id, appId, pieceId, model, tokens, cost, durationMs, outcome, error |
| DailyUsage | appId, date, count |

## 7. Quality and non-functional requirements

- **Content quality rules** (applied in validation and in the system prompt): hook leads with the audience's pain or result; one idea per piece; short lines readable with sound off; one CTA at the end tied to the app.
- **Honesty:** no invented stats, reviews, comments, offers or milestones; satire and memes use invented names and handles only, with no real people or brand logos.
- **Licensing:** only stock sources with commercial-use licences; record the source and licence per asset.
- **Performance targets (proposed):** draft ready within 60 seconds of tapping Generate; swipe interactions respond within 200 ms; in-browser Reel export of 30 seconds completes within 2 minutes on a typical laptop.
- **Security:** profile data and content are private to the owning user.
- **Cost control:** the 5-per-app-per-day limit and per-call logging keep AI and stock API usage visible.
- **Reliability:** AI or stock API failure never loses profile data or existing drafts.

## 8. Success metrics

- Pieces approved, generated and exported per app.
- Approved-to-discarded ratio, per format and overall.
- Share of generations that needed a retry or a skip.

## 9. Open items and proposed defaults

These were not decided yet. Each has a proposed default so the build can proceed; please confirm or change them.

| # | Open item | Proposed default |
| --- | --- | --- |
| 1 | Feed scope: one feed across all apps, or per app | One feed across all apps, plus per-app filter |
| 2 | Does regenerate count towards the daily limit of 5 | Yes, each AI generation counts; a skip retry does not |
| 3 | Time zone for the daily reset | The user's local time zone, reset at midnight |
| 4 | Discarded pieces: deleted for good or kept hidden | Deleted permanently |
| 5 | Can an approved piece be edited or un-approved later | Edit and re-export allowed; no un-approve |
| 6 | Pillar, persona and feature selection | Random, but not repeating the last three picks for the app |
| 7 | Browser export technology (for example in-browser video encoding) | Decide in the technical design; must meet FR-7.1 to FR-7.7 |
| 8 | Stock provider list and fallback order | Primary provider plus one fallback |
| 9 | Minimum profile fields (FR-1.9) | As listed in FR-1.9 |
| 10 | Where drafts and assets are stored | App backend storage, private to the user |

## 10. Acceptance criteria (summary)

- A user can complete an app profile and, with the minimum fields filled, generate a piece in one tap.
- Over 100 consecutive generations, every one of the 72 formats can be produced when its required profile data exists, and formats missing required data are skipped and redrawn.
- No generated piece contains a stat, review, comment, offer or milestone that is not in the profile.
- Every draft passes validation (hook length, line length, Reel duration) before it reaches the feed.
- The user can edit text, swap media, change timing and regenerate, and the preview reflects each change.
- Swiping approves or discards correctly on mobile and desktop.
- Approved Reels export as silent 1080 x 1920 MP4, and approved images and carousel slides export as 1080 x 1350 PNG files with caption and hashtags.
- The sixth generation attempt for an app on one day is blocked.

## 11. References

- 72 Short-Form Content Formats for App Growth (Instagram Reels): format structures, hooks, share triggers, Instagram format map, shared system prompt, output schemas and per-format prompts.
