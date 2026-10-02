# PRD: My Content Engine (v1)

**Status:** Draft

**Stack:** Amplify Gen2 (backend), React (web, mobile-responsive), OpenAI API

**Scope:** Personal use (single user, multiple apps). SaaS is a later goal.

> Legend: items marked **[Decided]** came directly from product decisions. Items marked **[Proposed]** are my suggestions to fill gaps and need your confirmation. Items marked **[Open]** are unresolved.
> 

---

## 1. Overview

My Content Engine automates short-form social content for apps. The user registers apps, configures what content they want daily, and the engine generates drafts with AI. Each day the user reviews drafts in a reels-style feed: swipe right to approve, swipe left to discard. Approved content can be downloaded as MP4 or images.

## 2. Problem and Goals

**Problem:** Creating consistent marketing content for several apps is repetitive and time-consuming.

**Goals**

1. Replace manual creation with a short daily review.
2. Generate content built around a specific, real "moment" from the app's features, not generic hooks.
3. Keep the user in control: every piece is reviewed and editable before approval.
4. Make the review loop fast on mobile.

**Non-goals (v1)**

- Instagram or any social publishing/scheduling (approve = status change only)
- Audio/music
- Prompt-based editing
- Performance-based learning
- Multi-user, teams, billing
- Native mobile app (web is mobile-responsive)
- AI-generated video

## 3. Users and Platform

| Item | Decision |
| --- | --- |
| User | Single owner, multiple apps **[Decided]** |
| Future | SaaS **[Decided]** |
| Platform | Web, mobile-responsive **[Decided]** |
| App types | Any kind of app **[Decided]** |
| Auth | Existing Cognito-authenticated user |

## 4. Core Concepts

### 4.1 App

A product being promoted.

| Field | Notes |
| --- | --- |
| id | Primary key |
| title | Required |
| description | Required |
| context | Free text; appended to the AI system prompt as reference |
| logo | Image; shown in lists and on every feed card |
| instagramAccount | One per app **[Decided]**; stored only in v1, not used |
| dailyConfig | See 5.2 |

### 4.2 Content

One generated or manual piece.

| Field | Notes |
| --- | --- |
| id, appId | Keys |
| status | DRAFT, APPROVED, DISCARDED |
| type | SHORT_FORM_VIDEO, CAROUSEL, MEME, SINGLE_IMAGE, TEXT_POST **[Decided: all 5 in v1]** |
| title | Short internal title |
| caption, hashtags | Distribution copy |
| videoKeywords | Stock search keywords |
| targetPersona | Who it lands with |
| relatabilityHook | The "moment found" |
| angel (angle) | Angle name (field currently spelled `angel` in code) |
| overlayText | JSON: timeline segments + full static string |
| videoConfigurations | JSON: duration, format, energy level, pacing, etc. |
| audioConfig | JSON, unused in v1 (no audio) |
| source | AI or MANUAL **[Proposed]** |
| batchDate | Date of the daily run that produced it **[Proposed]** |
| reviewedAt | Timestamp of approve/discard **[Proposed]** |

### 4.3 Status lifecycle

```
DRAFT --swipe right--> APPROVED (downloadable)
DRAFT --swipe left---> DISCARDED (permanent, removed, no undo)
```

Discarded content is gone and not shown in any list **[Decided]**.

## 5. Features

### 5.1 Apps List

- Shows all apps with logo and title.
- "Add app" action opens the app form (same fields as the Configurations tab).
- Selecting an app opens the app detail screen.

**Acceptance criteria**

- User can create an app with title and description; logo optional **[Proposed]**.
- List updates immediately after adding.

### 5.2 App Detail (2 tabs)

#### Tab 1: Content

- Table of content for the app: title, type, status, created date **[Proposed columns]**.
- Button **AI generate**: creates one draft on demand using the app's config.
- Button **Manual generate**: opens an empty content form with the same fields as the editor. Optional fallback for when AI is not working **[Decided]**.
- Clicking a row opens the Content Editor (5.3).

#### Tab 2: Configurations

- Title, description, app context, logo.
- Instagram account (one per app).
- **Daily generation settings [Decided: all of the following]:**
    - Number of pieces per day: max **5** per app
    - Content types allowed
    - Emotions
    - Angles and formats to choose from (per app; replaces today's fully random selection)
    - Duration and tone options

**Acceptance criteria**

- Number of pieces cannot exceed 5.
- At least one content type must be selected for daily generation **[Proposed]**.
- Saved config applies to the next daily run.

### 5.3 Content Editor (two-pane screen)

**Left pane: configuration**

- Title, caption, hashtags
- Video/image keywords
- Overlay text
- Timing (duration)

**Right pane: live preview**

- Renders the content from the current configuration.
- Video comes from a free stock API (Pexels today).
- Images come from a stock image API **[Decided]**.
- Preview updates as the left pane changes.

**Priorities [Decided]**

- Must-have edits: overlay text, video change, timing.
- Good-to-have: the remaining fields, if they fit the screen.

**Download [Decided]**

- Approved content can be downloaded: MP4 for video, image files for image types.

**Acceptance criteria**

- Changing keywords can fetch a different clip, and the user can pick/swap one.
- Changing overlay text updates the preview without a reload.
- Changing duration updates the overlay segment to span the full duration (single segment, start 0, end = total).
- Edits persist on save.

### 5.4 Content Types

| Type | v1 composition | Source of media |
| --- | --- | --- |
| Short-form video | Stock video + overlay text | Stock video API |
| Meme | Background image + green-screen video + overlay text **[Decided]** | Image: stock API. Green-screen clip: **[Open]** (see section 10) |
| Single image | Image + overlay text | Stock image API |
| Carousel | Multiple slides, each image + text **[Proposed]** | Stock image API |
| Text post | Text only (caption/body) | None |

**Required engineering change:** the current Lambda schema is video-only. Each content type needs its own output schema (e.g. slides for carousel, layers for meme).

### 5.5 Daily Generation

- Runs once a day at a **fixed time**, same for everyone in v1 **[Decided]**.
- For each app, generates the configured number of pieces (max 5) **[Decided]**.
- **Review gate [Decided]:** the run is skipped for an app if the previous day's content was not reviewed. "Reviewed" means **at least one piece** was approved or discarded.
- Generation reuses the existing Lambda approach (OpenAI structured JSON).
- Format, angle and duration are chosen from the app's configured options per piece **[Decided direction]**.

**Edge cases [Proposed]**

- First run for a new app: no previous day, so generate.
- AI failure for a piece: skip that piece, keep the rest, show a message; user can use Manual generate.
- Partial batch: generated pieces are shown; no automatic retry in v1.

### 5.6 Home Feed (Daily Review)

- Vertical, reels-style feed; one piece per screen.
- **One mixed stream across all apps [Decided]**: e.g. 3 apps x 5 = 15 pieces in one scroll.
- Each card shows **app name and logo [Decided]**.
- **Swipe right: Approve.** Status becomes APPROVED.
- **Swipe left: Discard.** Permanent; removed from the system view **[Decided]**.
- **Edit** button opens an Instagram-story-style editor (text, video, timing) **[Decided]**. Prompt-based editing comes in a later version.
- After the last card, show a completion state, then let the user browse apps and their contents **[Decided]**.
- On desktop, provide buttons and keyboard arrows as alternatives to swiping **[Proposed]**.

**Acceptance criteria**

- Swipe gestures work on touch devices; approve/discard buttons also available **[Proposed]**.
- Each card auto-plays its preview.
- A reviewed card never reappears in the feed.
- Edits made in the story-style editor apply to the card when the user returns to the feed.

## 6. AI Generation Rules (carried from current Lambda)

**Moment-finding**

- Find one concrete, specific scene that happens because of a specific mechanic in the app.
- Reject any moment that still works if the app name is swapped.
- Record `moment_found` and `why_this_is_specific`.

**Writing rules**

- Texting-a-friend voice, imperfect and human.
- Total on-screen text under 25 words, one overlay segment spanning the full duration.
- Banned: "game changer", "level up", "seamless", "empower", "revolutionize", "unlock", and anything that sounds like a pitch deck.
- Overlay text matches the selected format (POV, Overheard-thought, Text-to-a-friend, Screenshot-caption, Confession, Rant).

**Video rules**

- Energy matches the emotion in the text (High / Medium / Quiet-but-real); default to high energy and real reactions.
- Search keywords describe a candid reaction, not a mood.
- Durations: 6, 9 or 12 seconds.
- 15 predefined angles (FOMO, Problem-Agitate-Solve, Frustration, Belief, Controversial, Before/After, Social Proof, Curiosity Gap, Relatable Pain/POV, Confession, Myth-Busting, Hidden Feature Reveal, Comparison, Challenge/Dare, Satisfying).

**Output**

- Strict JSON matching the schema; saved as a DRAFT Content row.
- Model: OpenAI (default currently gpt-4o-mini, configurable via env).

## 7. Non-Functional Requirements [Proposed]

- **Performance:** feed cards preload the next card; swipe feels instant.
- **Reliability:** daily run is idempotent (no duplicate batches for the same date).
- **Cost:** track OpenAI cost per piece (no hard cap in v1).
- **Security:** OpenAI key stays in SSM; only authenticated users call generate endpoints.
- **Responsiveness:** all screens usable at mobile widths.

## 8. Success Metrics (v1) [Decided]

| Metric | Definition |
| --- | --- |
| Approved | Count of content approved |
| Approval ratio | Approved : discarded |
| Generated | Count of content generated (supporting) |

"Published" is deferred until publishing exists.

## 9. Technical Notes

- **Backend:** Amplify Gen2: AppSync models (Apps, Content), Lambda for generation behind API Gateway with a Cognito JWT authorizer, SSM for the OpenAI key.
- **Daily run:** scheduled trigger **[Proposed: EventBridge schedule]** invoking generation per app per its config.
- **Data additions:** per-app daily config fields on Apps; `batchDate`, `reviewedAt`, `source` on Content.
- **Preview:** browser-rendered from keywords + overlay + timing.
- **Export:** MP4/image generation approach is **[Open]**.
- **Frontend:** React; swipe feed and responsive layouts.

## 10. Open Questions

1. **Meme green-screen clips in v1:** where do they come from if the S3 library is a later phase? Options: stock API, or seed a small S3 set now.
2. **MP4 export:** render in the browser (e.g. canvas/MediaRecorder or ffmpeg.wasm) or server-side (Lambda/container)? Needs a decision before build.
3. **Stock footage licensing:** confirm Pexels (and any image API) terms allow downloading and posting the exported content.
4. **Feed and app-wise browsing:** confirm that after the mixed feed ends, the user browses by app (as written in 5.6).
5. **Instagram approach (later):** draft vs. scheduled publishing, depending on API limits. Deferred.
6. **Daily run time:** what fixed time and timezone to use in v1?
7. **Carousel structure:** number of slides and layout (proposed in 5.4 but not confirmed).

## 11. Release Plan

**v1 (this PRD)**

- Apps list and add
- App detail with Content and Configurations tabs
- Daily config (count, types, emotions, angles/formats, duration)
- AI generate and manual generate
- All 5 content types
- Editor with live preview and download
- Daily generation with review gate
- Swipe feed with approve/discard

**Later versions**

1. Prompt-based editing of targeted elements
2. Instagram integration (draft or scheduled publishing), then other platforms (TikTok, YouTube Shorts, Facebook)
3. Audio/music
4. Own S3 media library (e.g. green-screen meme clips)
5. Performance-based learning
6. Configurable run time/timezone
7. Multi-user SaaS with pricing
8. Published-content metrics