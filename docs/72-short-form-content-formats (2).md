# 72 Short-Form Content Formats for App Growth (Instagram Reels)

*Text-first formats for consumer apps. No shooting, no AI video. Built from the formats Fastlane-style tools use (slideshows, wall-of-text, hook-and-demo, memes) plus carousel and series formats.*

## How to use this doc

- **Visual sources allowed:** app screen recordings, UI screenshots, licensed stock footage or images, motion text, original static templates.
- **Text is the product.** The visual only earns the stop. One idea per slide or beat, 5-10 words per line, readable with sound off, kept inside Reels safe zones.
- **Hook rule:** the first frame must show the hook as text. Hooks about the audience's pain or result beat hooks about your features or price.
- **CTA rule:** one CTA per post, at the end ("search [APP]", "link in bio", "comment [WORD]"). Views without installs are wasted, so every format ends by tying back to the app.
- **Placeholders:** [PAIN] = audience problem, [RESULT] = desired outcome, [APP] = your app, [N] = number.
- **Memes:** use original or licensed templates. Reusing other people's clips risks claims and takedowns.

## Shared setup for the prompts

Every format prompt below is the **user prompt**. Send it together with the system prompt, and fill the `{{variables}}` from your App Profile and the per-run inputs. The model returns JSON in one of four schemas, chosen by the format's Instagram format.

**Variables**

- `{{app_name}}`, `{{persona}}`, `{{pillar}}` (Pain, How-to, Result, Myth or Identity), `{{feature}}`, `{{app_profile_json}}`
- Formats that need real input (reviews, comments, news, images) read it from the App Profile or an extra input field.

**System prompt (same for every format)**

```text
You are a senior short-form content strategist for consumer apps, writing for Instagram.
You write only text. Visuals and audio come from stock APIs and templates.

Rules:
1. Use only facts, stats, reviews, comments, offers and milestones that appear in the App Profile. Never invent them. If a required fact is missing, return {"skip": "<reason>"}.
2. Hooks lead with the audience's pain or result, not with app features or price.
3. One idea per post. Short lines of 5-10 words. It must read with the sound off.
4. Follow the profile's voice, banned words and forbidden claims.
5. Visual queries are concrete scenes or objects (for example "person writing notes at desk at night"), never abstract ideas.
6. Return valid JSON only, matching the schema given. No markdown and no commentary.
```

**REEL_SCHEMA**

```json
{
  "hook_options": ["", "", ""],
  "hook": "chosen hook, max 8 words",
  "beats": [{"text": "5-10 words", "seconds": 2.5, "visual_query": "concrete stock search phrase"}],
  "cta": "",
  "caption": "",
  "hashtags": [],
  "audio_mood": "",
  "total_seconds": 0
}
```

**CAROUSEL_SCHEMA**

```json
{
  "hook_options": ["", "", ""],
  "slides": [{"role": "hook | value | cta", "headline": "max 8 words", "body": "max 25 words", "visual": "template name or stock query"}],
  "caption": "",
  "hashtags": []
}
```

**IMAGE_SCHEMA**

```json
{
  "hook_options": ["", "", ""],
  "text_lines": [""],
  "visual": "template name or stock/licensed image query",
  "caption": "",
  "hashtags": []
}
```

**STORY_SCHEMA**

```json
{
  "frames": [{"text": "", "sticker": "poll | quiz | question | slider | none", "sticker_text": "", "options": []}],
  "caption_note": ""
}
```

## A. Text-Overlay Video (1-8)

### 1. Wall of Text (Story)

*Instagram: **Reel** · Repost as: Story slides · Works best for: habit, wellness, learning apps*

- **Structure:** Dense but short paragraph of text appears line by line over a calm background: situation, struggle, turning point, what changed.
- **Hooks:**
  - I was [PAIN] for 2 years. Here's what finally worked.
  - Read this if you keep failing at [GOAL].
- **Visual:** Soft stock loop or blurred app screen. Text reveal timed to reading speed.
- **CTA:** "The tool that helped: [APP]."
- **Why it gets shared:** Feels like a personal confession, so people send it to a friend with 'you need to read this' and comment 'this is literally me'.

**Prompt**

```text
Write format #1: Wall of Text (Story).
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Dense but short paragraph of text appears line by line over a calm background: situation, struggle, turning point, what changed.

Hook patterns (adapt to this app and persona, do not copy):
- I was [PAIN] for 2 years. Here's what finally worked.
- Read this if you keep failing at [GOAL].

Visual direction: Soft stock loop or blurred app screen. Text reveal timed to reading speed.
CTA style: "The tool that helped: [APP]."
Why people will share or comment: Feels like a personal confession, so people send it to a friend with 'you need to read this' and comment 'this is literally me'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 2. Curiosity-Gap Reveal

*Instagram: **Reel** · Repost as: Story (poll sticker) · Works best for: any category*

- **Structure:** Hook promising a secret, 2-3 teaser lines, then the reveal on the last beat.
- **Hooks:**
  - The reason you can't [RESULT] has nothing to do with willpower.
  - Nobody explains this about [TOPIC].
- **Visual:** Stock b-roll with a text countdown feel. Reveal lands in the final 2 seconds.
- **CTA:** "Fix it in [APP]."
- **Why it gets shared:** The reveal contradicts a common belief, so people tag a friend to settle it ('wait, is this true?') and comment their own view.

**Prompt**

```text
Write format #2: Curiosity-Gap Reveal.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Hook promising a secret, 2-3 teaser lines, then the reveal on the last beat.

Hook patterns (adapt to this app and persona, do not copy):
- The reason you can't [RESULT] has nothing to do with willpower.
- Nobody explains this about [TOPIC].

Visual direction: Stock b-roll with a text countdown feel. Reveal lands in the final 2 seconds.
CTA style: "Fix it in [APP]."
Why people will share or comment: The reveal contradicts a common belief, so people tag a friend to settle it ('wait, is this true?') and comment their own view. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 3. Stop Doing X / Do This Instead

*Instagram: **Reel** · Repost as: Carousel · Works best for: productivity, finance, fitness*

- **Structure:** Wrong habit, why it fails, the better alternative, the app as the easy way.
- **Hooks:**
  - Stop [COMMON HABIT] if you want [RESULT].
  - You're doing [TASK] wrong.
- **Visual:** Red-cross text for the wrong way, green-check text for the right way.
- **CTA:** "Do it the easy way: [APP]."
- **Why it gets shared:** Calls out a habit viewers share with friends; they send it as 'stop doing this' or defend the habit in the comments.

**Prompt**

```text
Write format #3: Stop Doing X / Do This Instead.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Wrong habit, why it fails, the better alternative, the app as the easy way.

Hook patterns (adapt to this app and persona, do not copy):
- Stop [COMMON HABIT] if you want [RESULT].
- You're doing [TASK] wrong.

Visual direction: Red-cross text for the wrong way, green-check text for the right way.
CTA style: "Do it the easy way: [APP]."
Why people will share or comment: Calls out a habit viewers share with friends; they send it as 'stop doing this' or defend the habit in the comments. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 4. Numbered Rules

*Instagram: **Reel** · Repost as: Carousel · Works best for: habit, education, utility*

- **Structure:** "[N] rules I follow for [RESULT]". One rule per beat, shown for 2 seconds each.
- **Hooks:**
  - 3 rules that fixed my [AREA].
  - [N] rules nobody tells beginners.
- **Visual:** Background clip stays constant while the number and text change.
- **CTA:** "Rule [N]: track it in [APP]."
- **Why it gets shared:** Rules are easy to screenshot and send as advice; comments add 'rule 3 is me' or the viewer's own rule.

**Prompt**

```text
Write format #4: Numbered Rules.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"[N] rules I follow for [RESULT]". One rule per beat, shown for 2 seconds each.

Hook patterns (adapt to this app and persona, do not copy):
- 3 rules that fixed my [AREA].
- [N] rules nobody tells beginners.

Visual direction: Background clip stays constant while the number and text change.
CTA style: "Rule [N]: track it in [APP]."
Why people will share or comment: Rules are easy to screenshot and send as advice; comments add 'rule 3 is me' or the viewer's own rule. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 5. POV Scenario

*Instagram: **Reel** · Repost as: Single image · Works best for: habit, fitness, study apps*

- **Structure:** "POV:" line sets a relatable moment, 2-3 escalating text lines, a twist or fix.
- **Hooks:**
  - POV: it's 11pm and you still haven't [TASK].
  - POV: you finally stuck to [HABIT] for 30 days.
- **Visual:** Atmospheric stock clip (night desk, gym, commute) matching the moment.
- **CTA:** "Make this your POV: [APP]."
- **Why it gets shared:** Instantly relatable, so people tag the friend who lives this exact scenario.

**Prompt**

```text
Write format #5: POV Scenario.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"POV:" line sets a relatable moment, 2-3 escalating text lines, a twist or fix.

Hook patterns (adapt to this app and persona, do not copy):
- POV: it's 11pm and you still haven't [TASK].
- POV: you finally stuck to [HABIT] for 30 days.

Visual direction: Atmospheric stock clip (night desk, gym, commute) matching the moment.
CTA style: "Make this your POV: [APP]."
Why people will share or comment: Instantly relatable, so people tag the friend who lives this exact scenario. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 6. Truth-Bomb Quote

*Instagram: **Reel** · Repost as: Single image, Story · Works best for: discipline, wellness, finance*

- **Structure:** One strong statement, a short supporting line, a soft pivot to the app.
- **Hooks:**
  - Discipline is just a system you stopped breaking.
  - You don't need motivation. You need [X].
- **Visual:** Slow cinematic stock loop, large centred text.
- **CTA:** "Build the system: [APP]."
- **Why it gets shared:** Reads like a personal motto, so people repost it to Stories as an identity statement.

**Prompt**

```text
Write format #6: Truth-Bomb Quote.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
One strong statement, a short supporting line, a soft pivot to the app.

Hook patterns (adapt to this app and persona, do not copy):
- Discipline is just a system you stopped breaking.
- You don't need motivation. You need [X].

Visual direction: Slow cinematic stock loop, large centred text.
CTA style: "Build the system: [APP]."
Why people will share or comment: Reads like a personal motto, so people repost it to Stories as an identity statement. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 7. Routine Timeline

*Instagram: **Reel** · Repost as: Carousel · Works best for: habit, fitness, productivity*

- **Structure:** A time-stamped list (6am, 7am...) showing a routine, with the app appearing at one slot.
- **Hooks:**
  - My 5am routine, minus the fluff.
  - A realistic day to hit [GOAL].
- **Visual:** Stock clips per time slot, or one background with timestamps in text.
- **CTA:** "The 7am step is in [APP]."
- **Why it gets shared:** Viewers compare it with their own day and comment their wake-up time; people who want to copy it save it.

**Prompt**

```text
Write format #7: Routine Timeline.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A time-stamped list (6am, 7am...) showing a routine, with the app appearing at one slot.

Hook patterns (adapt to this app and persona, do not copy):
- My 5am routine, minus the fluff.
- A realistic day to hit [GOAL].

Visual direction: Stock clips per time slot, or one background with timestamps in text.
CTA style: "The 7am step is in [APP]."
Why people will share or comment: Viewers compare it with their own day and comment their wake-up time; people who want to copy it save it. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 8. Things Nobody Tells You

*Instagram: **Reel** · Repost as: Carousel · Works best for: any category*

- **Structure:** "[N] things nobody tells you about [TOPIC]", each a one-line insight, last one links to the app.
- **Hooks:**
  - Things nobody tells you about [TOPIC].
  - I wish I knew this about [TOPIC] earlier.
- **Visual:** Rotating stock clips or a single blurred app screen.
- **CTA:** "Save this, then try [APP]."
- **Why it gets shared:** Feels like insider knowledge, so people send it to someone just starting out ('send this to a beginner').

**Prompt**

```text
Write format #8: Things Nobody Tells You.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"[N] things nobody tells you about [TOPIC]", each a one-line insight, last one links to the app.

Hook patterns (adapt to this app and persona, do not copy):
- Things nobody tells you about [TOPIC].
- I wish I knew this about [TOPIC] earlier.

Visual direction: Rotating stock clips or a single blurred app screen.
CTA style: "Save this, then try [APP]."
Why people will share or comment: Feels like insider knowledge, so people send it to someone just starting out ('send this to a beginner'). Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## B. Carousel Posts (9-16)

### 9. N-Step How-To

*Instagram: **Carousel** · Repost as: Reel slideshow · Works best for: education, productivity, finance*

- **Structure:** Hook slide, 4-6 steps (one action each), final slide with the app as the tool for a step.
- **Hooks:**
  - How to [RESULT] in [N] steps.
  - [RESULT] in [TIME]: the exact steps.
- **Visual:** Clean template, step number large, minimal text per slide.
- **CTA:** Last slide: "Step 3 is automatic in [APP]."
- **Why it gets shared:** Complete and practical, so it gets saved and sent to whoever once asked 'how do I...?'.

**Prompt**

```text
Write format #9: N-Step How-To.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Hook slide, 4-6 steps (one action each), final slide with the app as the tool for a step.

Hook patterns (adapt to this app and persona, do not copy):
- How to [RESULT] in [N] steps.
- [RESULT] in [TIME]: the exact steps.

Visual direction: Clean template, step number large, minimal text per slide.
CTA style: Last slide: "Step 3 is automatic in [APP]."
Why people will share or comment: Complete and practical, so it gets saved and sent to whoever once asked 'how do I...?'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 10. Myth vs Fact

*Instagram: **Carousel** · Repost as: Story (poll sticker) · Works best for: health, finance, learning*

- **Structure:** Each slide pairs a myth with the fact, and the final slide asks which myth the reader believed.
- **Hooks:**
  - [N] myths about [TOPIC] that cost you [RESULT].
  - Stop believing these [TOPIC] myths.
- **Visual:** Split layout: red myth block, green fact block.
- **CTA:** "Comment the myth you believed."
- **Why it gets shared:** Pushes people to confess or argue ('I believed #3'), which makes it the highest-comment format in the list.

**Prompt**

```text
Write format #10: Myth vs Fact.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Each slide pairs a myth with the fact, and the final slide asks which myth the reader believed.

Hook patterns (adapt to this app and persona, do not copy):
- [N] myths about [TOPIC] that cost you [RESULT].
- Stop believing these [TOPIC] myths.

Visual direction: Split layout: red myth block, green fact block.
CTA style: "Comment the myth you believed."
Why people will share or comment: Pushes people to confess or argue ('I believed #3'), which makes it the highest-comment format in the list. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 11. Mistakes List

*Instagram: **Carousel** · Repost as: Reel slideshow · Works best for: any category*

- **Structure:** "[N] mistakes" with a short why and fix on each slide.
- **Hooks:**
  - [N] mistakes keeping you from [RESULT].
  - I made all [N] of these.
- **Visual:** Consistent mistake-number badge, short fix line.
- **CTA:** "Avoid mistake #[N] with [APP]."
- **Why it gets shared:** Creates guilty recognition; people tag the friend who makes mistake #2 and comment which ones they have made.

**Prompt**

```text
Write format #11: Mistakes List.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"[N] mistakes" with a short why and fix on each slide.

Hook patterns (adapt to this app and persona, do not copy):
- [N] mistakes keeping you from [RESULT].
- I made all [N] of these.

Visual direction: Consistent mistake-number badge, short fix line.
CTA style: "Avoid mistake #[N] with [APP]."
Why people will share or comment: Creates guilty recognition; people tag the friend who makes mistake #2 and comment which ones they have made. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 12. Saveable Checklist

*Instagram: **Carousel** · Repost as: Story · Works best for: utility, travel, finance, productivity*

- **Structure:** A checklist where each slide holds 2-3 items, closing with "save this".
- **Hooks:**
  - The only [TOPIC] checklist you need.
  - Screenshot this before your next [EVENT].
- **Visual:** Checkbox icons, high contrast.
- **CTA:** "Get this as a reminder in [APP]."
- **Why it gets shared:** Screenshot-worthy, so it gets forwarded to group chats before an event or deadline.

**Prompt**

```text
Write format #12: Saveable Checklist.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A checklist where each slide holds 2-3 items, closing with "save this".

Hook patterns (adapt to this app and persona, do not copy):
- The only [TOPIC] checklist you need.
- Screenshot this before your next [EVENT].

Visual direction: Checkbox icons, high contrast.
CTA style: "Get this as a reminder in [APP]."
Why people will share or comment: Screenshot-worthy, so it gets forwarded to group chats before an event or deadline. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 13. Framework / Mental Model

*Instagram: **Carousel** · Repost as: Single image · Works best for: learning, discipline, finance*

- **Structure:** Name the framework, explain each part with a one-line example, apply it to a real case.
- **Hooks:**
  - The [NAME] rule for [RESULT].
  - One mental model that changed how I [ACTION].
- **Visual:** Simple diagram or labelled boxes built from CSS shapes.
- **CTA:** "Apply it in [APP]."
- **Why it gets shared:** Gives a name to something people already feel, so they pass it to friends and coworkers as a shortcut.

**Prompt**

```text
Write format #13: Framework / Mental Model.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Name the framework, explain each part with a one-line example, apply it to a real case.

Hook patterns (adapt to this app and persona, do not copy):
- The [NAME] rule for [RESULT].
- One mental model that changed how I [ACTION].

Visual direction: Simple diagram or labelled boxes built from CSS shapes.
CTA style: "Apply it in [APP]."
Why people will share or comment: Gives a name to something people already feel, so they pass it to friends and coworkers as a shortcut. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 14. Before / After Comparison

*Instagram: **Carousel** · Repost as: Reel · Works best for: fitness, utility, finance*

- **Structure:** Paired slides: old way vs new way, with real screenshots where possible.
- **Hooks:**
  - Before vs after [ACTION].
  - What changed after 30 days of [HABIT].
- **Visual:** Left/right layout, matching crops on both sides.
- **CTA:** "Start your 'after': [APP]."
- **Why it gets shared:** Visible proof of change; people ask 'how long did it take?' and send it to motivate someone.

**Prompt**

```text
Write format #14: Before / After Comparison.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Paired slides: old way vs new way, with real screenshots where possible.

Hook patterns (adapt to this app and persona, do not copy):
- Before vs after [ACTION].
- What changed after 30 days of [HABIT].

Visual direction: Left/right layout, matching crops on both sides.
CTA style: "Start your 'after': [APP]."
Why people will share or comment: Visible proof of change; people ask 'how long did it take?' and send it to motivate someone. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 15. Mini Case Story

*Instagram: **Carousel** · Repost as: Reel · Works best for: habit, wellness, education*

- **Structure:** Situation, struggle, what changed, result, lesson. One beat per slide.
- **Hooks:**
  - How [PERSONA] went from [BAD STATE] to [GOOD STATE].
  - A small change that fixed [PAIN].
- **Visual:** Story-style text slides on a simple gradient.
- **CTA:** "Try the same change with [APP]."
- **Why it gets shared:** A story with a good ending; people share it with someone in the same situation ('this could be you').

**Prompt**

```text
Write format #15: Mini Case Story.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Situation, struggle, what changed, result, lesson. One beat per slide.

Hook patterns (adapt to this app and persona, do not copy):
- How [PERSONA] went from [BAD STATE] to [GOOD STATE].
- A small change that fixed [PAIN].

Visual direction: Story-style text slides on a simple gradient.
CTA style: "Try the same change with [APP]."
Why people will share or comment: A story with a good ending; people share it with someone in the same situation ('this could be you'). Write so this happens.
Extra rules: Use only real or clearly generic personas. Use only a real story from the App Profile proof, or a clearly generic persona. Never invent testimonials.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 16. Best Apps For X

*Instagram: **Carousel** · Repost as: Reel slideshow · Works best for: utility, productivity, finance*

- **Structure:** Listicle of 4-5 apps or tools for a goal, with your app positioned honestly as one pick.
- **Hooks:**
  - [N] apps that quietly fix [PAIN].
  - Apps I use every day for [GOAL].
- **Visual:** One screenshot per slide, one-line benefit.
- **CTA:** "Number [N] is [APP]."
- **Why it gets shared:** Lists invite disagreement and additions; people comment their own picks and send it to friends who need tools.

**Prompt**

```text
Write format #16: Best Apps For X.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Listicle of 4-5 apps or tools for a goal, with your app positioned honestly as one pick.

Hook patterns (adapt to this app and persona, do not copy):
- [N] apps that quietly fix [PAIN].
- Apps I use every day for [GOAL].

Visual direction: One screenshot per slide, one-line benefit.
CTA style: "Number [N] is [APP]."
Why people will share or comment: Lists invite disagreement and additions; people comment their own picks and send it to friends who need tools. Write so this happens.
Extra rules: Position the app honestly as one pick among several. Do not disparage the others.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## C. Meme and Relatable (17-21)

### 17. "Me When" Reaction Caption

*Meme · Instagram: **Single image** · Repost as: Reel (still), Story · Works best for: any category*

- **Structure:** A reaction visual with a caption describing a relatable moment, optional punchline line.
- **Hooks:**
  - Me when I finally [DO THING].
  - Me after [HABIT] for 7 days.
- **Visual:** Licensed or original reaction image or loop. Caption is the content.
- **CTA:** Soft: "Tag someone who does this." Add the app in the caption or pinned comment.
- **Why it gets shared:** Pure relatability; people send it straight to the friend it describes.

**Prompt**

```text
Write format #17: "Me When" Reaction Caption.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A reaction visual with a caption describing a relatable moment, optional punchline line.

Hook patterns (adapt to this app and persona, do not copy):
- Me when I finally [DO THING].
- Me after [HABIT] for 7 days.

Visual direction: Licensed or original reaction image or loop. Caption is the content.
CTA style: Soft: "Tag someone who does this." Add the app in the caption or pinned comment.
Why people will share or comment: Pure relatability; people send it straight to the friend it describes. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 18. Expectation vs Reality

*Meme · Instagram: **Single image or 2-slide carousel** · Repost as: Reel · Works best for: fitness, habit, study*

- **Structure:** Two panels: what you planned vs what happened, then a third panel with the fix.
- **Hooks:**
  - Expectation vs reality: [GOAL].
  - Planning vs doing: [AREA].
- **Visual:** Two-panel static or short loop.
- **CTA:** Third panel: "Reality with [APP]."
- **Why it gets shared:** Self-deprecating humour people share as 'us'; comments fill up with their own version of reality.

**Prompt**

```text
Write format #18: Expectation vs Reality.
Instagram format: Single image or 2-slide carousel. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Two panels: what you planned vs what happened, then a third panel with the fix.

Hook patterns (adapt to this app and persona, do not copy):
- Expectation vs reality: [GOAL].
- Planning vs doing: [AREA].

Visual direction: Two-panel static or short loop.
CTA style: Third panel: "Reality with [APP]."
Why people will share or comment: Self-deprecating humour people share as 'us'; comments fill up with their own version of reality. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 19. Choice Meme (Original Template)

*Meme · Instagram: **Single image** · Repost as: Reel (still) · Works best for: habit, productivity*

- **Structure:** Reject the bad behaviour in panel one, approve the better one in panel two.
- **Hooks:**
  - Doomscrolling vs [GOOD HABIT].
  - Another all-nighter vs a plan.
- **Visual:** Original two-panel template you own.
- **CTA:** Caption: "Pick one. We know which wins."
- **Why it gets shared:** Forces a side, so comments turn into a debate and people tag who they would vote for.

**Prompt**

```text
Write format #19: Choice Meme (Original Template).
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Reject the bad behaviour in panel one, approve the better one in panel two.

Hook patterns (adapt to this app and persona, do not copy):
- Doomscrolling vs [GOOD HABIT].
- Another all-nighter vs a plan.

Visual direction: Original two-panel template you own.
CTA style: Caption: "Pick one. We know which wins."
Why people will share or comment: Forces a side, so comments turn into a debate and people tag who they would vote for. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 20. "Nobody: / Me:" Format

*Meme · Instagram: **Single image** · Repost as: Story · Works best for: any category*

- **Structure:** Empty "Nobody:" line, then a hyper-specific habit as "Me:".
- **Hooks:**
  - Nobody: ... Me at 2am: [HABIT].
  - Nobody asked, but I [BEHAVIOUR].
- **Visual:** Plain background, bold text.
- **CTA:** "Fix this habit with [APP]." in the caption.
- **Why it gets shared:** The hyper-specific habit makes people tag the friend who does it.

**Prompt**

```text
Write format #20: "Nobody: / Me:" Format.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Empty "Nobody:" line, then a hyper-specific habit as "Me:".

Hook patterns (adapt to this app and persona, do not copy):
- Nobody: ... Me at 2am: [HABIT].
- Nobody asked, but I [BEHAVIOUR].

Visual direction: Plain background, bold text.
CTA style: "Fix this habit with [APP]." in the caption.
Why people will share or comment: The hyper-specific habit makes people tag the friend who does it. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 21. Tell Me You Without Telling Me

*Meme · Instagram: **Single image** · Repost as: Story (question sticker) · Works best for: engagement and shares*

- **Structure:** Prompt line plus a specific, funny answer rooted in your audience's pain.
- **Hooks:**
  - Tell me you're a [PERSONA] without telling me.
  - Tell me you [PAIN] without saying it.
- **Visual:** Simple text card or reaction loop.
- **CTA:** "Comment your answer."
- **Why it gets shared:** Invites viewers to finish the joke, so replies flood the comments.

**Prompt**

```text
Write format #21: Tell Me You Without Telling Me.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Prompt line plus a specific, funny answer rooted in your audience's pain.

Hook patterns (adapt to this app and persona, do not copy):
- Tell me you're a [PERSONA] without telling me.
- Tell me you [PAIN] without saying it.

Visual direction: Simple text card or reaction loop.
CTA style: "Comment your answer."
Why people will share or comment: Invites viewers to finish the joke, so replies flood the comments. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## D. Hook + Demo (22-27)

### 22. Problem to App Solution

*Instagram: **Reel** · Repost as: Story · Works best for: utility, productivity, finance*

- **Structure:** Pain hook (2 sec), screen recording of the app solving it (8-15 sec), result line.
- **Hooks:**
  - If you [PAIN], watch this.
  - This fixes [PAIN] in 10 seconds.
- **Visual:** Clean screen recording with tap highlights and overlay captions.
- **CTA:** "Search [APP]."
- **Why it gets shared:** Solves a problem people have right now; they share it with 'you need this' and comment 'link?'.

**Prompt**

```text
Write format #22: Problem to App Solution.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Pain hook (2 sec), screen recording of the app solving it (8-15 sec), result line.

Hook patterns (adapt to this app and persona, do not copy):
- If you [PAIN], watch this.
- This fixes [PAIN] in 10 seconds.

Visual direction: Clean screen recording with tap highlights and overlay captions.
CTA style: "Search [APP]."
Why people will share or comment: Solves a problem people have right now; they share it with 'you need this' and comment 'link?'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 23. "What App Is This?" Comment Bait

*Instagram: **Reel** · Repost as: Story teaser · Works best for: utility, creative tools, learning*

- **Structure:** Show an impressive in-app moment with no app name; the comments ask for it.
- **Hooks:**
  - Why doesn't everyone know this exists?
  - I can't believe this is free.
- **Visual:** Screen recording of the most satisfying feature, no logo on screen.
- **CTA:** Reply to comments with the name; pin the answer.
- **Why it gets shared:** Withholds the app name on purpose, so people ask in the comments and tag friends to find out.

**Prompt**

```text
Write format #23: "What App Is This?" Comment Bait.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Show an impressive in-app moment with no app name; the comments ask for it.

Hook patterns (adapt to this app and persona, do not copy):
- Why doesn't everyone know this exists?
- I can't believe this is free.

Visual direction: Screen recording of the most satisfying feature, no logo on screen.
CTA style: Reply to comments with the name; pin the answer.
Why people will share or comment: Withholds the app name on purpose, so people ask in the comments and tag friends to find out. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 24. Hidden Feature Hack

*Instagram: **Reel** · Repost as: Carousel (steps) · Works best for: utility, productivity*

- **Structure:** "Did you know?" setup, step-by-step taps in 3 steps, payoff.
- **Hooks:**
  - Hidden setting that saves [TIME].
  - Most people never find this.
- **Visual:** Zoom on the tap path, step numbers overlaid.
- **CTA:** "Save this, then try [APP]."
- **Why it gets shared:** Delivers an 'I didn't know that' moment; people share it to show friends a hack.

**Prompt**

```text
Write format #24: Hidden Feature Hack.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"Did you know?" setup, step-by-step taps in 3 steps, payoff.

Hook patterns (adapt to this app and persona, do not copy):
- Hidden setting that saves [TIME].
- Most people never find this.

Visual direction: Zoom on the tap path, step numbers overlaid.
CTA style: "Save this, then try [APP]."
Why people will share or comment: Delivers an 'I didn't know that' moment; people share it to show friends a hack. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 25. Result Screenshot Demo

*Instagram: **Reel** · Repost as: Carousel (screenshots) · Works best for: habit, fitness, finance, learning*

- **Structure:** Show an outcome (streak, chart, score) and break down how it was reached in 3 lines.
- **Hooks:**
  - [N] days in a row. Here's how.
  - This chart changed my [AREA].
- **Visual:** App result screen, zoom on the key number.
- **CTA:** "Start your streak: [APP]."
- **Why it gets shared:** Social proof; commenters share their own numbers and ask how to start.

**Prompt**

```text
Write format #25: Result Screenshot Demo.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Show an outcome (streak, chart, score) and break down how it was reached in 3 lines.

Hook patterns (adapt to this app and persona, do not copy):
- [N] days in a row. Here's how.
- This chart changed my [AREA].

Visual direction: App result screen, zoom on the key number.
CTA style: "Start your streak: [APP]."
Why people will share or comment: Social proof; commenters share their own numbers and ask how to start. Write so this happens.
Extra rules: Describe only results visible in the supplied screenshots.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 26. Speed Run

*Instagram: **Reel** · Repost as: Story · Works best for: utility, tools*

- **Structure:** On-screen timer, one task completed in the app, final time shown.
- **Hooks:**
  - [TASK] in [N] seconds.
  - Can [APP] do this in under 10 seconds?
- **Visual:** Screen recording with a visible timer overlay.
- **CTA:** "Beat my time."
- **Why it gets shared:** Built-in challenge; people comment their own time and dare friends to beat it.

**Prompt**

```text
Write format #26: Speed Run.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
On-screen timer, one task completed in the app, final time shown.

Hook patterns (adapt to this app and persona, do not copy):
- [TASK] in [N] seconds.
- Can [APP] do this in under 10 seconds?

Visual direction: Screen recording with a visible timer overlay.
CTA style: "Beat my time."
Why people will share or comment: Built-in challenge; people comment their own time and dare friends to beat it. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 27. Old Way vs App Way

*Instagram: **Reel** · Repost as: Carousel · Works best for: productivity, finance, utility*

- **Structure:** Split screen: manual process vs the app, with time or effort difference as text.
- **Hooks:**
  - The old way vs the [APP] way.
  - Why am I still doing this manually?
- **Visual:** Side-by-side screen recordings or screenshots.
- **CTA:** "Make the switch."
- **Why it gets shared:** Shows wasted effort, so people send it to the friend still doing it the old way.

**Prompt**

```text
Write format #27: Old Way vs App Way.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Split screen: manual process vs the app, with time or effort difference as text.

Hook patterns (adapt to this app and persona, do not copy):
- The old way vs the [APP] way.
- Why am I still doing this manually?

Visual direction: Side-by-side screen recordings or screenshots.
CTA style: "Make the switch."
Why people will share or comment: Shows wasted effort, so people send it to the friend still doing it the old way. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## E. Series and Engagement (28-30)

### 28. Challenge / Streak Series

*Instagram: **Reel** · Repost as: Story highlight · Works best for: habit, fitness, learning*

- **Structure:** Recurring "Day N of [CHALLENGE]" posts with a one-line lesson per day, app used as the tracker.
- **Hooks:**
  - Day [N] of [CHALLENGE]: [TODAY'S LESSON].
  - Join me: [N]-day [CHALLENGE].
- **Visual:** Same template each day, only the day number and text change.
- **CTA:** "Join in with [APP]."
- **Why it gets shared:** Invites participation; people comment 'Day 1' and tag a challenge buddy.

**Prompt**

```text
Write format #28: Challenge / Streak Series.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Recurring "Day N of [CHALLENGE]" posts with a one-line lesson per day, app used as the tracker.

Hook patterns (adapt to this app and persona, do not copy):
- Day [N] of [CHALLENGE]: [TODAY'S LESSON].
- Join me: [N]-day [CHALLENGE].

Visual direction: Same template each day, only the day number and text change.
CTA style: "Join in with [APP]."
Why people will share or comment: Invites participation; people comment 'Day 1' and tag a challenge buddy. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 29. This-or-That / Comment Question

*Instagram: **Story (poll sticker)** · Repost as: Single image · Works best for: engagement boosts between demo posts*

- **Structure:** A binary question that invites a comment, with the app mentioned only in the pinned comment.
- **Hooks:**
  - Morning workout or evening? Be honest.
  - Plan the night before or wing it?
- **Visual:** Split card with two options.
- **CTA:** "Comment A or B."
- **Why it gets shared:** A one-letter comment costs nothing, and polarising choices push comment counts up.

**Prompt**

```text
Write format #29: This-or-That / Comment Question.
Instagram format: Story (poll sticker). Output schema: STORY_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A binary question that invites a comment, with the app mentioned only in the pinned comment.

Hook patterns (adapt to this app and persona, do not copy):
- Morning workout or evening? Be honest.
- Plan the night before or wing it?

Visual direction: Split card with two options.
CTA style: "Comment A or B."
Why people will share or comment: A one-letter comment costs nothing, and polarising choices push comment counts up. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 30. Insight / Data Drop

*Instagram: **Carousel** · Repost as: Single image · Works best for: any category once you have real data*

- **Structure:** One surprising stat from your own app data or a public source, why it matters, one action.
- **Hooks:**
  - We looked at [N] users. Here's what the top 10% do.
  - The most common reason people quit [HABIT].
- **Visual:** Large number, simple bar or text stat.
- **CTA:** "See your own number in [APP]."
- **Why it gets shared:** A surprising stat feels like news; people share it with 'this explains a lot' and comment their own result.

**Prompt**

```text
Write format #30: Insight / Data Drop.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
One surprising stat from your own app data or a public source, why it matters, one action.

Hook patterns (adapt to this app and persona, do not copy):
- We looked at [N] users. Here's what the top 10% do.
- The most common reason people quit [HABIT].

Visual direction: Large number, simple bar or text stat.
CTA style: "See your own number in [APP]."
Why people will share or comment: A surprising stat feels like news; people share it with 'this explains a lot' and comment their own result. Write so this happens.
Extra rules: Never invent statistics. Use only stats from proof.stats. If there are none, return a skip.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## F. Opinion and Debate (31-36)

### 31. Tier List

*Instagram: **Carousel (tier reveal)** · Repost as: Reel · Works best for: any category*

- **Structure:** Rank 5-8 habits, tools or ideas into S/A/B/C tiers, one reveal per beat, with your reason in one line.
- **Hooks:**
  - Ranking every [TOPIC] habit, S tier to trash.
  - Your favourite [THING] is probably C tier.
- **Visual:** A tier-list grid built as a template; items slide into rows.
- **CTA:** "Disagree? Comment your S tier."
- **Why it gets shared:** Everyone disagrees with at least one placement, so people argue in the comments and send it to a friend with 'we need to talk about your S tier'.

**Prompt**

```text
Write format #31: Tier List.
Instagram format: Carousel (tier reveal). Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Rank 5-8 habits, tools or ideas into S/A/B/C tiers, one reveal per beat, with your reason in one line.

Hook patterns (adapt to this app and persona, do not copy):
- Ranking every [TOPIC] habit, S tier to trash.
- Your favourite [THING] is probably C tier.

Visual direction: A tier-list grid built as a template; items slide into rows.
CTA style: "Disagree? Comment your S tier."
Why people will share or comment: Everyone disagrees with at least one placement, so people argue in the comments and send it to a friend with 'we need to talk about your S tier'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 32. Unpopular Opinion / Hot Take

*Instagram: **Reel** · Repost as: Single image · Works best for: any category*

- **Structure:** One bold opinion in the first frame, two reasons, then a question asking whether the viewer agrees.
- **Hooks:**
  - Unpopular opinion: [COMMON BELIEF] is overrated.
  - I'll get hate for this, but [OPINION].
- **Visual:** Bold text on a dark stock loop with a 'hot take' label.
- **CTA:** "Agree or disagree? Tell me below."
- **Why it gets shared:** Splits the audience into two sides, so agreeing and disagreeing commenters both push comment counts up, and people share it to settle arguments.

**Prompt**

```text
Write format #32: Unpopular Opinion / Hot Take.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
One bold opinion in the first frame, two reasons, then a question asking whether the viewer agrees.

Hook patterns (adapt to this app and persona, do not copy):
- Unpopular opinion: [COMMON BELIEF] is overrated.
- I'll get hate for this, but [OPINION].

Visual direction: Bold text on a dark stock loop with a 'hot take' label.
CTA style: "Agree or disagree? Tell me below."
Why people will share or comment: Splits the audience into two sides, so agreeing and disagreeing commenters both push comment counts up, and people share it to settle arguments. Write so this happens.
Extra rules: Keep opinions defensible and never attack people or groups.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 33. Red Flags vs Green Flags

*Instagram: **Carousel** · Repost as: Reel · Works best for: finance, wellness, productivity, learning*

- **Structure:** Alternate slides or beats: 3 red flags, then 3 green flags in one domain (habits, tools, routines), with the app's feature as one green flag only if it is honest.
- **Hooks:**
  - Green flags vs red flags in [AREA].
  - Red flags you ignore until it's too late.
- **Visual:** Red and green text cards, one flag per beat.
- **CTA:** "Add your own flag in the comments."
- **Why it gets shared:** Easy to send to a friend with 'this is a red flag', and viewers add their own flags, which keeps the comments going.

**Prompt**

```text
Write format #33: Red Flags vs Green Flags.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Alternate slides or beats: 3 red flags, then 3 green flags in one domain (habits, tools, routines), with the app's feature as one green flag only if it is honest.

Hook patterns (adapt to this app and persona, do not copy):
- Green flags vs red flags in [AREA].
- Red flags you ignore until it's too late.

Visual direction: Red and green text cards, one flag per beat.
CTA style: "Add your own flag in the comments."
Why people will share or comment: Easy to send to a friend with 'this is a red flag', and viewers add their own flags, which keeps the comments going. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 34. Types of People

*Instagram: **Carousel** · Repost as: Reel · Works best for: fitness, study, productivity, finance*

- **Structure:** "[N] types of [PERSONA]" with a one-line label and a joke per type; the last type is the one with a system.
- **Hooks:**
  - Types of people at [ACTIVITY].
  - Which [PERSONA] are you?
- **Visual:** Numbered text cards over a looping background.
- **CTA:** "Comment your type."
- **Why it gets shared:** People identify with one type and tag the friends who match the others.

**Prompt**

```text
Write format #34: Types of People.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"[N] types of [PERSONA]" with a one-line label and a joke per type; the last type is the one with a system.

Hook patterns (adapt to this app and persona, do not copy):
- Types of people at [ACTIVITY].
- Which [PERSONA] are you?

Visual direction: Numbered text cards over a looping background.
CTA style: "Comment your type."
Why people will share or comment: People identify with one type and tag the friends who match the others. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 35. Rate Yourself 1-10

*Instagram: **Story (slider sticker)** · Repost as: Single image · Works best for: habit, fitness, finance, learning*

- **Structure:** Name an area, describe the scale with three anchors (3, 6, 9), and ask viewers to comment their number.
- **Hooks:**
  - Rate your [AREA] from 1 to 10. Be honest.
  - Most people are a 4 at this. Are you?
- **Visual:** A large scale graphic with anchors, built from CSS shapes.
- **CTA:** "Drop your number."
- **Why it gets shared:** Answering costs one number, and people compare scores with friends in the replies.

**Prompt**

```text
Write format #35: Rate Yourself 1-10.
Instagram format: Story (slider sticker). Output schema: STORY_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Name an area, describe the scale with three anchors (3, 6, 9), and ask viewers to comment their number.

Hook patterns (adapt to this app and persona, do not copy):
- Rate your [AREA] from 1 to 10. Be honest.
- Most people are a 4 at this. Are you?

Visual direction: A large scale graphic with anchors, built from CSS shapes.
CTA style: "Drop your number."
Why people will share or comment: Answering costs one number, and people compare scores with friends in the replies. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 36. Signs You're a [Persona]

*Instagram: **Carousel** · Repost as: Reel · Works best for: any category*

- **Structure:** Hook plus 5-7 hyper-specific signs, with a self-aware punchline as the last sign.
- **Hooks:**
  - Signs you're a [PERSONA] and don't know it.
  - You might be a [PERSONA] if...
- **Visual:** Checklist cards appearing one at a time.
- **CTA:** "Comment how many you have."
- **Why it gets shared:** People count how many apply and tag the friends who tick every box.

**Prompt**

```text
Write format #36: Signs You're a [Persona].
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Hook plus 5-7 hyper-specific signs, with a self-aware punchline as the last sign.

Hook patterns (adapt to this app and persona, do not copy):
- Signs you're a [PERSONA] and don't know it.
- You might be a [PERSONA] if...

Visual direction: Checklist cards appearing one at a time.
CTA style: "Comment how many you have."
Why people will share or comment: People count how many apply and tag the friends who tick every box. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## G. Emotional and Identity (37-42)

### 37. Letter to Past Self

*Instagram: **Reel** · Repost as: Carousel · Works best for: habit, wellness, learning*

- **Structure:** 'Dear [past me]' opening, 4-5 short lines of advice, a hopeful closing line.
- **Hooks:**
  - Dear me, two years ago...
  - What I wish I'd known before [MILESTONE].
- **Visual:** Soft stock loop or paper-style background with a slow text reveal.
- **CTA:** "Save this for a bad day."
- **Why it gets shared:** Emotional resonance; people send it to someone in the same phase and comment their own letter lines.

**Prompt**

```text
Write format #37: Letter to Past Self.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
'Dear [past me]' opening, 4-5 short lines of advice, a hopeful closing line.

Hook patterns (adapt to this app and persona, do not copy):
- Dear me, two years ago...
- What I wish I'd known before [MILESTONE].

Visual direction: Soft stock loop or paper-style background with a slow text reveal.
CTA style: "Save this for a bad day."
Why people will share or comment: Emotional resonance; people send it to someone in the same phase and comment their own letter lines. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 38. Permission Slip

*Instagram: **Reel** · Repost as: Carousel · Works best for: wellness, habit, productivity*

- **Structure:** "You're allowed to..." repeated 4-5 times with a concrete permission each, closing with a gentle push toward one action.
- **Hooks:**
  - Permission slip for anyone behind on [GOAL].
  - You're allowed to [REST / RESTART].
- **Visual:** Calm background, centred text, one line per beat.
- **CTA:** "Send this to someone who needs it."
- **Why it gets shared:** Feels like a kind message to forward; people send it to a friend who is being hard on themselves.

**Prompt**

```text
Write format #38: Permission Slip.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"You're allowed to..." repeated 4-5 times with a concrete permission each, closing with a gentle push toward one action.

Hook patterns (adapt to this app and persona, do not copy):
- Permission slip for anyone behind on [GOAL].
- You're allowed to [REST / RESTART].

Visual direction: Calm background, centred text, one line per beat.
CTA style: "Send this to someone who needs it."
Why people will share or comment: Feels like a kind message to forward; people send it to a friend who is being hard on themselves. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 39. For the Person Who...

*Instagram: **Reel** · Repost as: Single image · Works best for: any category*

- **Structure:** "For the person who..." naming a specific struggle in 2-3 lines, then one reassurance and one next step.
- **Hooks:**
  - This is for the person who [STRUGGLE].
  - If you're still trying to [GOAL], read this.
- **Visual:** Dark minimal background, direct text.
- **CTA:** "Tag them."
- **Why it gets shared:** It names a person in the viewer's life, so tagging them is the natural reaction.

**Prompt**

```text
Write format #39: For the Person Who....
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
"For the person who..." naming a specific struggle in 2-3 lines, then one reassurance and one next step.

Hook patterns (adapt to this app and persona, do not copy):
- This is for the person who [STRUGGLE].
- If you're still trying to [GOAL], read this.

Visual direction: Dark minimal background, direct text.
CTA style: "Tag them."
Why people will share or comment: It names a person in the viewer's life, so tagging them is the natural reaction. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 40. Fake Chat Conversation

*Instagram: **Reel** · Repost as: Carousel · Works best for: habit, productivity, study, fitness*

- **Structure:** Message bubbles between 'me' and 'my brain' (or a friend), 5-7 messages, ending with a punchline or a tip.
- **Hooks:**
  - Me and my brain at 11pm.
  - Texting my future self about [GOAL].
- **Visual:** Chat-bubble template rendered from JSON.
- **CTA:** "Send this to your group chat."
- **Why it gets shared:** It looks like a screenshot people recognise from their own chats, so it goes straight into group chats.

**Prompt**

```text
Write format #40: Fake Chat Conversation.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Message bubbles between 'me' and 'my brain' (or a friend), 5-7 messages, ending with a punchline or a tip.

Hook patterns (adapt to this app and persona, do not copy):
- Me and my brain at 11pm.
- Texting my future self about [GOAL].

Visual direction: Chat-bubble template rendered from JSON.
CTA style: "Send this to your group chat."
Why people will share or comment: It looks like a screenshot people recognise from their own chats, so it goes straight into group chats. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 41. Things I Stopped Doing

*Instagram: **Carousel** · Repost as: Reel · Works best for: habit, wellness, finance, productivity*

- **Structure:** A list of 5-7 things you stopped doing, each with a one-line result; the last item ties to the app.
- **Hooks:**
  - Things I stopped doing that changed my [AREA].
  - [N] things I quit this year.
- **Visual:** Strikethrough text effect over each item.
- **CTA:** "What would you quit? Comment."
- **Why it gets shared:** People copy the list for themselves and comment the habit they plan to drop.

**Prompt**

```text
Write format #41: Things I Stopped Doing.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A list of 5-7 things you stopped doing, each with a one-line result; the last item ties to the app.

Hook patterns (adapt to this app and persona, do not copy):
- Things I stopped doing that changed my [AREA].
- [N] things I quit this year.

Visual direction: Strikethrough text effect over each item.
CTA style: "What would you quit? Comment."
Why people will share or comment: People copy the list for themselves and comment the habit they plan to drop. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 42. Small Wins Celebration

*Instagram: **Reel** · Repost as: Story · Works best for: habit, wellness, fitness, learning*

- **Structure:** Hook asking viewers to count small wins, 4-5 overlooked examples, a closing line to celebrate one.
- **Hooks:**
  - Tiny wins that count more than you think.
  - If you did one of these today, you're ahead.
- **Visual:** Warm gradient background with checkmarks appearing.
- **CTA:** "Comment your win today."
- **Why it gets shared:** Invites a low-effort, positive comment and gets forwarded as encouragement.

**Prompt**

```text
Write format #42: Small Wins Celebration.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Hook asking viewers to count small wins, 4-5 overlooked examples, a closing line to celebrate one.

Hook patterns (adapt to this app and persona, do not copy):
- Tiny wins that count more than you think.
- If you did one of these today, you're ahead.

Visual direction: Warm gradient background with checkmarks appearing.
CTA style: "Comment your win today."
Why people will share or comment: Invites a low-effort, positive comment and gets forwarded as encouragement. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## H. Educational Carousels (43-49)

### 43. Jargon Decoder

*Instagram: **Carousel** · Repost as: Reel · Works best for: finance, learning, health, utility*

- **Structure:** One term per slide: the term, a plain-language definition, an everyday example.
- **Hooks:**
  - [N] [TOPIC] terms explained like you're new.
  - Stop nodding along when people say [TERM].
- **Visual:** Term in large type, definition below, one consistent template.
- **CTA:** "Save this glossary."
- **Why it gets shared:** People save it as a reference and send it to the friend who always asks what a term means.

**Prompt**

```text
Write format #43: Jargon Decoder.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
One term per slide: the term, a plain-language definition, an everyday example.

Hook patterns (adapt to this app and persona, do not copy):
- [N] [TOPIC] terms explained like you're new.
- Stop nodding along when people say [TERM].

Visual direction: Term in large type, definition below, one consistent template.
CTA style: "Save this glossary."
Why people will share or comment: People save it as a reference and send it to the friend who always asks what a term means. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 44. Cheat Sheet

*Instagram: **Carousel** · Repost as: Single image · Works best for: utility, finance, learning, productivity*

- **Structure:** Grouped rules, numbers or shortcuts laid out like one page across a few slides that the viewer can screenshot.
- **Hooks:**
  - The [TOPIC] cheat sheet you'll screenshot.
  - Everything about [TOPIC] on one page.
- **Visual:** Dense but tidy grid with headings and bullets, high contrast.
- **CTA:** "Save and send to someone."
- **Why it gets shared:** A screenshot-worthy reference that people send to the group chat or a coworker.

**Prompt**

```text
Write format #44: Cheat Sheet.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Grouped rules, numbers or shortcuts laid out like one page across a few slides that the viewer can screenshot.

Hook patterns (adapt to this app and persona, do not copy):
- The [TOPIC] cheat sheet you'll screenshot.
- Everything about [TOPIC] on one page.

Visual direction: Dense but tidy grid with headings and bullets, high contrast.
CTA style: "Save and send to someone."
Why people will share or comment: A screenshot-worthy reference that people send to the group chat or a coworker. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 45. Copy-Paste Template

*Instagram: **Carousel** · Repost as: Reel · Works best for: productivity, finance, study, wellness*

- **Structure:** Show the template (plan, budget, message, schedule) with blanks, explain 3 fields, offer the full version through a comment keyword.
- **Hooks:**
  - Steal this [TEMPLATE] I use every week.
  - Copy this [PLAN] and fill in the blanks.
- **Visual:** Template shown as a card with the fill-in fields highlighted.
- **CTA:** "Comment TEMPLATE for the link." (Set up an auto-reply or DM.)
- **Why it gets shared:** The comment keyword gives a direct reason to comment, and a free template gets shared with friends.

**Prompt**

```text
Write format #45: Copy-Paste Template.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Show the template (plan, budget, message, schedule) with blanks, explain 3 fields, offer the full version through a comment keyword.

Hook patterns (adapt to this app and persona, do not copy):
- Steal this [TEMPLATE] I use every week.
- Copy this [PLAN] and fill in the blanks.

Visual direction: Template shown as a card with the fill-in fields highlighted.
CTA style: "Comment TEMPLATE for the link." (Set up an auto-reply or DM.)
Why people will share or comment: The comment keyword gives a direct reason to comment, and a free template gets shared with friends. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 46. Levels 1 to 5

*Instagram: **Carousel** · Repost as: Story · Works best for: fitness, learning, finance, productivity*

- **Structure:** Five slides from beginner to expert for one skill; each level shows what you do and a mistake to avoid; the last slide asks for the viewer's level.
- **Hooks:**
  - Level 1 to Level 5 of [SKILL].
  - Which [SKILL] level are you actually at?
- **Visual:** Level badge on each slide with a progress bar across the carousel.
- **CTA:** "Comment your level."
- **Why it gets shared:** People rank themselves in the comments and tag friends who are 'still level 1'.

**Prompt**

```text
Write format #46: Levels 1 to 5.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Five slides from beginner to expert for one skill; each level shows what you do and a mistake to avoid; the last slide asks for the viewer's level.

Hook patterns (adapt to this app and persona, do not copy):
- Level 1 to Level 5 of [SKILL].
- Which [SKILL] level are you actually at?

Visual direction: Level badge on each slide with a progress bar across the carousel.
CTA style: "Comment your level."
Why people will share or comment: People rank themselves in the comments and tag friends who are 'still level 1'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 47. Which Type Are You? (Quiz)

*Instagram: **Carousel** · Repost as: Story (quiz sticker) · Works best for: habit, wellness, learning, productivity*

- **Structure:** 3-4 quiz questions on slides with A/B/C answers, then a result slide mapping answers to a fun type, with one app tip per type.
- **Hooks:**
  - Which [THEME] type are you? Take the quiz.
  - Answer 3 questions, get your [TYPE].
- **Visual:** Question cards with options, one result card per type.
- **CTA:** "Comment your result."
- **Why it gets shared:** People post their result to Stories and compare it with friends.

**Prompt**

```text
Write format #47: Which Type Are You? (Quiz).
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
3-4 quiz questions on slides with A/B/C answers, then a result slide mapping answers to a fun type, with one app tip per type.

Hook patterns (adapt to this app and persona, do not copy):
- Which [THEME] type are you? Take the quiz.
- Answer 3 questions, get your [TYPE].

Visual direction: Question cards with options, one result card per type.
CTA style: "Comment your result."
Why people will share or comment: People post their result to Stories and compare it with friends. Write so this happens.
Extra rules: Keep types light and non-medical.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 48. The Math / Reality Check

*Instagram: **Carousel** · Repost as: Reel · Works best for: finance, productivity, fitness, wellness*

- **Structure:** One calculation that reframes a habit (cost per day, hours per year), the result in huge type, one action.
- **Hooks:**
  - The maths on [HABIT] will shock you.
  - [SMALL AMOUNT] a day is [BIG NUMBER] a year.
- **Visual:** Big numbers on clean slides, the equation built step by step.
- **CTA:** "Run your own number."
- **Why it gets shared:** A shocking number gets sent to friends with 'look at this', and viewers comment their own totals.

**Prompt**

```text
Write format #48: The Math / Reality Check.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
One calculation that reframes a habit (cost per day, hours per year), the result in huge type, one action.

Hook patterns (adapt to this app and persona, do not copy):
- The maths on [HABIT] will shock you.
- [SMALL AMOUNT] a day is [BIG NUMBER] a year.

Visual direction: Big numbers on clean slides, the equation built step by step.
CTA style: "Run your own number."
Why people will share or comment: A shocking number gets sent to friends with 'look at this', and viewers comment their own totals. Write so this happens.
Extra rules: Use only numbers you can check. Every number must come from the App Profile or a named source. Show the calculation.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 49. FAQ Carousel

*Instagram: **Carousel** · Repost as: Story (question box) · Works best for: any category*

- **Structure:** 'Questions I keep getting' with one question per slide and a short answer; the last slide invites new questions.
- **Hooks:**
  - Answering the [TOPIC] questions I get every day.
  - You asked: [TOP QUESTION].
- **Visual:** Question as a chat bubble, answer below it.
- **CTA:** "Comment your question for part 2."
- **Why it gets shared:** Viewers recognise their own question, save it, and comment new ones that feed the next post.

**Prompt**

```text
Write format #49: FAQ Carousel.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
'Questions I keep getting' with one question per slide and a short answer; the last slide invites new questions.

Hook patterns (adapt to this app and persona, do not copy):
- Answering the [TOPIC] questions I get every day.
- You asked: [TOP QUESTION].

Visual direction: Question as a chat bubble, answer below it.
CTA style: "Comment your question for part 2."
Why people will share or comment: Viewers recognise their own question, save it, and comment new ones that feed the next post. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## I. App-Led Proof and Product (50-56)

### 50. Free Alternative to Paid Tools

*Instagram: **Reel** · Repost as: Carousel · Works best for: utility, finance, productivity*

- **Structure:** Name the paid category, show the free or cheaper way in the app, end with what the viewer saves.
- **Hooks:**
  - Stop paying for [PAID TOOL TYPE].
  - A free way to [RESULT] most people don't know.
- **Visual:** Screen recording with a price-tag text overlay.
- **CTA:** "Search [APP]."
- **Why it gets shared:** Saving money is a strong reason to send it to a friend, and commenters ask for the name.

**Prompt**

```text
Write format #50: Free Alternative to Paid Tools.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Name the paid category, show the free or cheaper way in the app, end with what the viewer saves.

Hook patterns (adapt to this app and persona, do not copy):
- Stop paying for [PAID TOOL TYPE].
- A free way to [RESULT] most people don't know.

Visual direction: Screen recording with a price-tag text overlay.
CTA style: "Search [APP]."
Why people will share or comment: Saving money is a strong reason to send it to a friend, and commenters ask for the name. Write so this happens.
Extra rules: Compare only on facts you can verify. Compare only on facts in the profile's competitors data. No false claims about other products.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 51. 60-Second Setup

*Instagram: **Reel** · Repost as: Story · Works best for: all apps, especially new launches*

- **Structure:** Timer shown, 3-5 steps to the first result in the app, final result screen.
- **Hooks:**
  - Set up [APP] in 60 seconds.
  - From download to first [RESULT] in one minute.
- **Visual:** Screen recording with step numbers and a countdown.
- **CTA:** "Try it and comment your time."
- **Why it gets shared:** An easy challenge; people share it to show friends how simple the app is and comment their time.

**Prompt**

```text
Write format #51: 60-Second Setup.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Timer shown, 3-5 steps to the first result in the app, final result screen.

Hook patterns (adapt to this app and persona, do not copy):
- Set up [APP] in 60 seconds.
- From download to first [RESULT] in one minute.

Visual direction: Screen recording with step numbers and a countdown.
CTA style: "Try it and comment your time."
Why people will share or comment: An easy challenge; people share it to show friends how simple the app is and comment their time. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 52. You Asked, We Built

*Instagram: **Reel** · Repost as: Story · Works best for: any app with an active audience*

- **Structure:** Show a real comment requesting a feature, then the feature in the app, then a thank-you line.
- **Hooks:**
  - You asked for [FEATURE]. It's live.
  - Someone commented this, so we built it.
- **Visual:** Comment screenshot card followed by a screen recording.
- **CTA:** "What should we build next? Comment."
- **Why it gets shared:** Commenters feel heard and come back with new requests, and the original commenter often shares it.

**Prompt**

```text
Write format #52: You Asked, We Built.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Show a real comment requesting a feature, then the feature in the app, then a thank-you line.

Hook patterns (adapt to this app and persona, do not copy):
- You asked for [FEATURE]. It's live.
- Someone commented this, so we built it.

Visual direction: Comment screenshot card followed by a screen recording.
CTA style: "What should we build next? Comment."
Why people will share or comment: Commenters feel heard and come back with new requests, and the original commenter often shares it. Write so this happens.
Extra rules: Use only real comments. Use only a real comment from proof.comments.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 53. Real Review Spotlight

*Instagram: **Single image** · Repost as: Reel, Story · Works best for: apps with real store reviews*

- **Structure:** A real user review as large text, then a screen recording of the feature it mentions.
- **Hooks:**
  - A user said this about [APP] and we had to share it.
  - This review made our week.
- **Visual:** Review card with star rating, followed by app footage.
- **CTA:** "Search [APP]."
- **Why it gets shared:** Social proof from a stranger; the reviewer and their friends share it, and others comment their own experience.

**Prompt**

```text
Write format #53: Real Review Spotlight.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A real user review as large text, then a screen recording of the feature it mentions.

Hook patterns (adapt to this app and persona, do not copy):
- A user said this about [APP] and we had to share it.
- This review made our week.

Visual direction: Review card with star rating, followed by app footage.
CTA style: "Search [APP]."
Why people will share or comment: Social proof from a stranger; the reviewer and their friends share it, and others comment their own experience. Write so this happens.
Extra rules: Never invent or edit reviews. Use only a real review from proof.reviews, unedited apart from trimming.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 54. Milestone / Build-in-Public Update

*Instagram: **Carousel** · Repost as: Story · Works best for: any app with real numbers*

- **Structure:** A real milestone (downloads, streaks, features), two lessons learned, what comes next.
- **Hooks:**
  - We hit [MILESTONE]. Here's what we learned.
  - [N] days building [APP] in public.
- **Visual:** Big number on simple text slides.
- **CTA:** "Follow for the next update."
- **Why it gets shared:** Builders share transparent numbers with their peers, and viewers comment advice.

**Prompt**

```text
Write format #54: Milestone / Build-in-Public Update.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A real milestone (downloads, streaks, features), two lessons learned, what comes next.

Hook patterns (adapt to this app and persona, do not copy):
- We hit [MILESTONE]. Here's what we learned.
- [N] days building [APP] in public.

Visual direction: Big number on simple text slides.
CTA style: "Follow for the next update."
Why people will share or comment: Builders share transparent numbers with their peers, and viewers comment advice. Write so this happens.
Extra rules: Never inflate figures. Use only real milestones from proof.milestones. Never round up.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 55. Why We Built It

*Instagram: **Reel** · Repost as: Carousel · Works best for: indie apps and new launches*

- **Structure:** Personal problem, failed alternatives, the idea, what it does now, an invitation.
- **Hooks:**
  - I built [APP] because [PAIN] kept happening to me.
  - The problem that made me build an app.
- **Visual:** Text story over stock footage or a blurred app screen.
- **CTA:** "Tell me if you relate."
- **Why it gets shared:** A real origin story invites people to share their own version of the same problem.

**Prompt**

```text
Write format #55: Why We Built It.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Personal problem, failed alternatives, the idea, what it does now, an invitation.

Hook patterns (adapt to this app and persona, do not copy):
- I built [APP] because [PAIN] kept happening to me.
- The problem that made me build an app.

Visual direction: Text story over stock footage or a blurred app screen.
CTA style: "Tell me if you relate."
Why people will share or comment: A real origin story invites people to share their own version of the same problem. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 56. Free Access Drop

*Instagram: **Reel** · Repost as: Story · Works best for: apps with a paid tier*

- **Structure:** Offer a real free trial, premium code or bonus to a limited group, state the rule to claim it, and set a deadline.
- **Hooks:**
  - Free [PREMIUM FEATURE] for the first [N] people.
  - Comment [WORD] and I'll send you access.
- **Visual:** Bold offer card with a countdown.
- **CTA:** "Comment [WORD]."
- **Why it gets shared:** The claim mechanic gives a direct reason to comment and to tag friends so they can claim too.

**Prompt**

```text
Write format #56: Free Access Drop.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Offer a real free trial, premium code or bonus to a limited group, state the rule to claim it, and set a deadline.

Hook patterns (adapt to this app and persona, do not copy):
- Free [PREMIUM FEATURE] for the first [N] people.
- Comment [WORD] and I'll send you access.

Visual direction: Bold offer card with a countdown.
CTA style: "Comment [WORD]."
Why people will share or comment: The claim mechanic gives a direct reason to comment and to tag friends so they can claim too. Write so this happens.
Extra rules: Follow each platform's promotion rules and only offer what you can deliver. Use only offers listed in the App Profile. Include the claim rule and a deadline.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## J. Timely and Trend (57-60)

### 57. Seasonal Hook

*Instagram: **Reel** · Repost as: Carousel · Works best for: any category; plan it two weeks ahead*

- **Structure:** Tie the app's value to a moment people already feel (exam season, New Year, payday, travel), give 3 tips, then the app.
- **Hooks:**
  - If you're stressed about [SEASONAL MOMENT], do this.
  - [N] days until [EVENT]: your plan.
- **Visual:** Seasonal stock loop or a date card with a countdown.
- **CTA:** "Save this plan."
- **Why it gets shared:** Timely and urgent, so people send it to friends facing the same deadline.

**Prompt**

```text
Write format #57: Seasonal Hook.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Tie the app's value to a moment people already feel (exam season, New Year, payday, travel), give 3 tips, then the app.

Hook patterns (adapt to this app and persona, do not copy):
- If you're stressed about [SEASONAL MOMENT], do this.
- [N] days until [EVENT]: your plan.

Visual direction: Seasonal stock loop or a date card with a countdown.
CTA style: "Save this plan."
Why people will share or comment: Timely and urgent, so people send it to friends facing the same deadline. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 58. Trend Sound + Text Remix

*Instagram: **Reel** · Repost as: None (audio-led) · Works best for: reach experiments*

- **Structure:** A trending Reels audio with the on-screen text rewritten for your niche's pain point.
- **Hooks:**
  - POV: [NICHE SITUATION].
  - Me explaining [TOPIC] to [PERSONA].
- **Visual:** Background still or stock clip, with text synced to the audio beats.
- **CTA:** "Follow for more [NICHE]."
- **Why it gets shared:** A familiar sound makes the joke instantly recognisable, so people send it to friends.

**Prompt**

```text
Write format #58: Trend Sound + Text Remix.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A trending Reels audio with the on-screen text rewritten for your niche's pain point.

Hook patterns (adapt to this app and persona, do not copy):
- POV: [NICHE SITUATION].
- Me explaining [TOPIC] to [PERSONA].

Visual direction: Background still or stock clip, with text synced to the audio beats.
CTA style: "Follow for more [NICHE]."
Why people will share or comment: A familiar sound makes the joke instantly recognisable, so people send it to friends. Write so this happens.
Extra rules: Use only audio available in the platform's music library. Mention a sound only if its name is supplied in the input.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 59. Breaking-News Style Update

*Instagram: **Reel** · Repost as: Single image · Works best for: finance, utility, health, learning*

- **Structure:** News-ticker headline about a real change (a new rule, a study, a platform update), two lines of explanation, what viewers should do.
- **Hooks:**
  - BREAKING: [REAL CHANGE] affects [AUDIENCE].
  - Nobody is talking about [REAL UPDATE].
- **Visual:** News-banner template with headline text.
- **CTA:** "Share this with someone affected."
- **Why it gets shared:** Timely information that affects friends feels useful to forward.

**Prompt**

```text
Write format #59: Breaking-News Style Update.
Instagram format: Reel. Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
News-ticker headline about a real change (a new rule, a study, a platform update), two lines of explanation, what viewers should do.

Hook patterns (adapt to this app and persona, do not copy):
- BREAKING: [REAL CHANGE] affects [AUDIENCE].
- Nobody is talking about [REAL UPDATE].

Visual direction: News-banner template with headline text.
CTA style: "Share this with someone affected."
Why people will share or comment: Timely information that affects friends feels useful to forward. Write so this happens.
Extra rules: Verify every claim and never fake news. Use only the real change supplied in the news input. Never invent news.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 60. Weekly Roundup

*Instagram: **Carousel** · Repost as: Reel · Works best for: any category with regular content*

- **Structure:** A recurring 'This week in [NICHE]' with 3 short items (tip, update, win), in the same template every week.
- **Hooks:**
  - This week in [NICHE]: 3 things you missed.
  - Your 30-second [NICHE] update.
- **Visual:** Fixed template with item numbers.
- **CTA:** "Follow for next week's roundup."
- **Why it gets shared:** A predictable series builds a return habit, and people forward it to friends in the same niche.

**Prompt**

```text
Write format #60: Weekly Roundup.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A recurring 'This week in [NICHE]' with 3 short items (tip, update, win), in the same template every week.

Hook patterns (adapt to this app and persona, do not copy):
- This week in [NICHE]: 3 things you missed.
- Your 30-second [NICHE] update.

Visual direction: Fixed template with item numbers.
CTA style: "Follow for next week's roundup."
Why people will share or comment: A predictable series builds a return habit, and people forward it to friends in the same niche. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## K. More Memes (61-72)

### 61. Meme Dump Carousel

*Meme · Instagram: **Carousel** · Repost as: Reel slideshow · Works best for: any category*

- **Structure:** 5-8 original meme slides on one theme, strongest first, the app appearing in one slide as a joke, a final slide asking for the viewer's favourite.
- **Hooks:**
  - [N] memes that describe your [NICHE] week.
  - Memes only a [PERSONA] will understand.
- **Visual:** One consistent meme template, one meme per slide, same font and colours.
- **CTA:** "Send it to your [PERSONA] friend."
- **Why it gets shared:** Different slides hit different people, so they tag several friends on different slides ('slide 4 is you').

**Prompt**

```text
Write format #61: Meme Dump Carousel.
Instagram format: Carousel. Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
5-8 original meme slides on one theme, strongest first, the app appearing in one slide as a joke, a final slide asking for the viewer's favourite.

Hook patterns (adapt to this app and persona, do not copy):
- [N] memes that describe your [NICHE] week.
- Memes only a [PERSONA] will understand.

Visual direction: One consistent meme template, one meme per slide, same font and colours.
CTA style: "Send it to your [PERSONA] friend."
Why people will share or comment: Different slides hit different people, so they tag several friends on different slides ('slide 4 is you'). Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 62. Swipe for the Punchline

*Meme · Instagram: **Carousel (2-3 slides)** · Repost as: Reel · Works best for: any category*

- **Structure:** Slide 1 sets up a relatable situation, slide 2 delivers the twist, an optional slide 3 shows the app as the fix.
- **Hooks:**
  - Me trying to [GOAL] (swipe).
  - Everyone thinks [BELIEF]. Swipe.
- **Visual:** Two or three clean text slides; the setup slide ends mid-thought to invite the swipe.
- **CTA:** "Swipe, then tag someone."
- **Why it gets shared:** The punchline rewards the swipe, so people send it with 'wait for slide 2'.

**Prompt**

```text
Write format #62: Swipe for the Punchline.
Instagram format: Carousel (2-3 slides). Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Slide 1 sets up a relatable situation, slide 2 delivers the twist, an optional slide 3 shows the app as the fix.

Hook patterns (adapt to this app and persona, do not copy):
- Me trying to [GOAL] (swipe).
- Everyone thinks [BELIEF]. Swipe.

Visual direction: Two or three clean text slides; the setup slide ends mid-thought to invite the swipe.
CTA style: "Swipe, then tag someone."
Why people will share or comment: The punchline rewards the swipe, so people send it with 'wait for slide 2'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 63. Stick-Figure Comic

*Meme · Instagram: **Carousel (panels)** · Repost as: Single image · Works best for: habit, productivity, study, fitness*

- **Structure:** A 3-4 panel comic with original stick figures: setup, escalation, twist, caption.
- **Hooks:**
  - Every time I try to [GOAL].
  - [PERSONA] explained in 4 panels.
- **Visual:** Original simple drawings rendered from templates, with speech bubbles as text variables.
- **CTA:** "Which panel are you?"
- **Why it gets shared:** Original recurring characters feel shareable, and people comment the panel that is them.

**Prompt**

```text
Write format #63: Stick-Figure Comic.
Instagram format: Carousel (panels). Output schema: CAROUSEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A 3-4 panel comic with original stick figures: setup, escalation, twist, caption.

Hook patterns (adapt to this app and persona, do not copy):
- Every time I try to [GOAL].
- [PERSONA] explained in 4 panels.

Visual direction: Original simple drawings rendered from templates, with speech bubbles as text variables.
CTA style: "Which panel are you?"
Why people will share or comment: Original recurring characters feel shareable, and people comment the panel that is them. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 64. Fake Notification Stack

*Meme · Instagram: **Single image** · Repost as: Story, Reel · Works best for: habit, productivity, fitness, finance*

- **Structure:** A lock-screen style stack of 3-4 funny notifications (reminders, alarms, messages from yourself) ending with a real nudge.
- **Hooks:**
  - My phone at 6am vs my phone at 11pm.
  - Notifications I deserve for [HABIT].
- **Visual:** Generic lock-screen template with invented app names and no real brand logos.
- **CTA:** "Screenshot your worst notification."
- **Why it gets shared:** It looks like a screenshot from the viewer's own phone, so people send it with 'my phone, every day'.

**Prompt**

```text
Write format #64: Fake Notification Stack.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A lock-screen style stack of 3-4 funny notifications (reminders, alarms, messages from yourself) ending with a real nudge.

Hook patterns (adapt to this app and persona, do not copy):
- My phone at 6am vs my phone at 11pm.
- Notifications I deserve for [HABIT].

Visual direction: Generic lock-screen template with invented app names and no real brand logos.
CTA style: "Screenshot your worst notification."
Why people will share or comment: It looks like a screenshot from the viewer's own phone, so people send it with 'my phone, every day'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 65. To-Do List vs Reality

*Meme · Instagram: **Single image** · Repost as: Carousel · Works best for: productivity, study, habit, fitness*

- **Structure:** A checklist of ambitious tasks, then a second list of what actually happened, with a small win as the last line.
- **Hooks:**
  - My to-do list vs what I actually did.
  - Monday plan vs Friday reality.
- **Visual:** Notes-app style card in two columns.
- **CTA:** "Show me your list."
- **Why it gets shared:** Self-deprecating and universal, so the comments fill with people's own lists.

**Prompt**

```text
Write format #65: To-Do List vs Reality.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A checklist of ambitious tasks, then a second list of what actually happened, with a small win as the last line.

Hook patterns (adapt to this app and persona, do not copy):
- My to-do list vs what I actually did.
- Monday plan vs Friday reality.

Visual direction: Notes-app style card in two columns.
CTA style: "Show me your list."
Why people will share or comment: Self-deprecating and universal, so the comments fill with people's own lists. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 66. Alignment Chart

*Meme · Instagram: **Single image** · Repost as: Story (poll sticker) · Works best for: study, fitness, finance, productivity*

- **Structure:** A 3x3 grid of behaviours in your niche, from organised to chaotic, with a short joke in each cell.
- **Hooks:**
  - [NICHE] alignment chart.
  - Which square are you?
- **Visual:** A 3x3 grid template with cells filled from variables.
- **CTA:** "Comment your square."
- **Why it gets shared:** Everyone places themselves and their friends in a square, so tagging and arguing follow.

**Prompt**

```text
Write format #66: Alignment Chart.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A 3x3 grid of behaviours in your niche, from organised to chaotic, with a short joke in each cell.

Hook patterns (adapt to this app and persona, do not copy):
- [NICHE] alignment chart.
- Which square are you?

Visual direction: A 3x3 grid template with cells filled from variables.
CTA style: "Comment your square."
Why people will share or comment: Everyone places themselves and their friends in a square, so tagging and arguing follow. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 67. Bell Curve Take

*Meme · Instagram: **Single image** · Repost as: Reel · Works best for: finance, fitness, learning, productivity*

- **Structure:** A bell-curve graphic where the left and right ends share the same simple take and the middle holds an over-complicated one.
- **Hooks:**
  - Beginners and experts agree: [SIMPLE TAKE].
  - The [TOPIC] bell curve.
- **Visual:** A bell-curve chart template with three captions, using simple shapes and no copyrighted characters.
- **CTA:** "Where are you on the curve?"
- **Why it gets shared:** People tag the friend who sits in the overcomplicating middle.

**Prompt**

```text
Write format #67: Bell Curve Take.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A bell-curve graphic where the left and right ends share the same simple take and the middle holds an over-complicated one.

Hook patterns (adapt to this app and persona, do not copy):
- Beginners and experts agree: [SIMPLE TAKE].
- The [TOPIC] bell curve.

Visual direction: A bell-curve chart template with three captions, using simple shapes and no copyrighted characters.
CTA style: "Where are you on the curve?"
Why people will share or comment: People tag the friend who sits in the overcomplicating middle. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 68. Venn Diagram Meme

*Meme · Instagram: **Single image** · Repost as: Carousel · Works best for: any category*

- **Structure:** Two or three overlapping circles with funny labels, with the punchline in the overlap.
- **Hooks:**
  - [THING A] + [THING B] = me at 2am.
  - The overlap nobody talks about.
- **Visual:** A Venn template with labels from variables.
- **CTA:** "What goes in your overlap?"
- **Why it gets shared:** The overlap is a recognisable shared state, so people send it with 'this is us'.

**Prompt**

```text
Write format #68: Venn Diagram Meme.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
Two or three overlapping circles with funny labels, with the punchline in the overlap.

Hook patterns (adapt to this app and persona, do not copy):
- [THING A] + [THING B] = me at 2am.
- The overlap nobody talks about.

Visual direction: A Venn template with labels from variables.
CTA style: "What goes in your overlap?"
Why people will share or comment: The overlap is a recognisable shared state, so people send it with 'this is us'. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 69. Loading Bar Meme

*Meme · Instagram: **Reel (animated bar)** · Repost as: Single image · Works best for: habit, productivity, study, fitness*

- **Structure:** A progress bar loading a joke label ('Motivation loading...') that stalls at an absurd percentage, then a one-line fix.
- **Hooks:**
  - Motivation loading: 3%.
  - Me starting [TASK]: loading...
- **Visual:** An animated bar rendered in Remotion, or a still with the percentage.
- **CTA:** "What percentage are you at?"
- **Why it gets shared:** Viewers reply with their own percentage and send it to friends who are stuck at 3%.

**Prompt**

```text
Write format #69: Loading Bar Meme.
Instagram format: Reel (animated bar). Output schema: REEL_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A progress bar loading a joke label ('Motivation loading...') that stalls at an absurd percentage, then a one-line fix.

Hook patterns (adapt to this app and persona, do not copy):
- Motivation loading: 3%.
- Me starting [TASK]: loading...

Visual direction: An animated bar rendered in Remotion, or a still with the percentage.
CTA style: "What percentage are you at?"
Why people will share or comment: Viewers reply with their own percentage and send it to friends who are stuck at 3%. Write so this happens.
Extra rules: Follow the shared rules only.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 70. Satirical Headline

*Meme · Instagram: **Single image** · Repost as: Reel · Works best for: habit, productivity, fitness, finance*

- **Structure:** A fake newspaper headline about a harmless, exaggerated scenario in your niche, with a one-line fake subhead.
- **Hooks:**
  - Local man still 'starting Monday'.
  - BREAKING: Area woman buys planner, never opens it.
- **Visual:** A newspaper-banner template with invented names only.
- **CTA:** "Tag the headline's subject."
- **Why it gets shared:** A headline is an easy way to tag a friend ('this is you'), and it invites replies with their own versions.

**Prompt**

```text
Write format #70: Satirical Headline.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A fake newspaper headline about a harmless, exaggerated scenario in your niche, with a one-line fake subhead.

Hook patterns (adapt to this app and persona, do not copy):
- Local man still 'starting Monday'.
- BREAKING: Area woman buys planner, never opens it.

Visual direction: A newspaper-banner template with invented names only.
CTA style: "Tag the headline's subject."
Why people will share or comment: A headline is an easy way to tag a friend ('this is you'), and it invites replies with their own versions. Write so this happens.
Extra rules: Make it clearly satire. Use invented names only, and no real people, accounts or news events.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 71. Fake Post Screenshot

*Meme · Instagram: **Single image** · Repost as: Carousel · Works best for: any category*

- **Structure:** A generic social-post screenshot from an invented handle saying something painfully relatable, with no real accounts or platform logos.
- **Hooks:**
  - Nobody talks about how [RELATABLE TRUTH].
  - Posting this so you feel seen.
- **Visual:** A generic post card template.
- **CTA:** "Reply with your version."
- **Why it gets shared:** It reads like a post the viewer wishes they had written, so people repost it to their Stories.

**Prompt**

```text
Write format #71: Fake Post Screenshot.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
A generic social-post screenshot from an invented handle saying something painfully relatable, with no real accounts or platform logos.

Hook patterns (adapt to this app and persona, do not copy):
- Nobody talks about how [RELATABLE TRUTH].
- Posting this so you feel seen.

Visual direction: A generic post card template.
CTA style: "Reply with your version."
Why people will share or comment: It reads like a post the viewer wishes they had written, so people repost it to their Stories. Write so this happens.
Extra rules: Use an invented handle only. No real accounts or platform logos.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

### 72. Caption This

*Meme · Instagram: **Single image** · Repost as: Story (question sticker) · Works best for: any category*

- **Structure:** An image or illustration with no caption; viewers write the caption and you share the best one.
- **Hooks:**
  - Caption this.
  - Best caption gets a shout-out.
- **Visual:** One clean image or illustration with space for a caption.
- **CTA:** "Comment your caption."
- **Why it gets shared:** A creative prompt with a clear win, so people comment and tag friends to compete.

**Prompt**

```text
Write format #72: Caption This.
Instagram format: Single image. Output schema: IMAGE_SCHEMA.

App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}
App Profile: {{app_profile_json}}

Structure to follow:
An image or illustration with no caption; viewers write the caption and you share the best one.

Hook patterns (adapt to this app and persona, do not copy):
- Caption this.
- Best caption gets a shout-out.

Visual direction: One clean image or illustration with space for a caption.
CTA style: "Comment your caption."
Why people will share or comment: A creative prompt with a clear win, so people comment and tag friends to compete. Write so this happens.
Extra rules: Use images you own or have licensed, and follow Instagram's promotion rules if you offer a prize. Use only images supplied as licensed or owned.

Return 3 options in hook_options, choose the strongest, then write the full piece around it.
```

---

## Instagram Format Map

Each of the 72 formats has one primary Instagram format and one repost option, so a single idea can launch in its best format and be reused. Memes are #17-21 and #61-72 (17 in total). Primary format count: 30 Reels, 26 carousels, 14 single images, 2 Stories.

**Specs for each Instagram format**

- **Reel:** 1080 x 1920 px (9:16). All video posts on Instagram show as Reels, and a still-image meme can be rendered as a 5-7 second Reel.
- **Carousel:** 1080 x 1350 px (4:5). The first slide sets the crop, so design every slide at the same size.
- **Single image:** 1080 x 1350 px (4:5) is Instagram's recommended feed size; 1080 x 1080 (1:1) also works. The profile grid previews at 3:4, so keep key text centred.
- **Story:** 1080 x 1920 px (9:16). Keep about 250 px clear at the top and bottom. Poll, quiz, question and slider stickers drive replies.

Source: [Buffer, Instagram Image Size Guide 2026](https://buffer.com/resources/instagram-image-size/), published Mar 17, 2026.

| # | Format | Primary Instagram format | Repost as |
| --- | --- | --- | --- |
| 1 | Wall of Text (Story) | Reel | Story slides |
| 2 | Curiosity-Gap Reveal | Reel | Story (poll sticker) |
| 3 | Stop Doing X / Do This Instead | Reel | Carousel |
| 4 | Numbered Rules | Reel | Carousel |
| 5 | POV Scenario | Reel | Single image |
| 6 | Truth-Bomb Quote | Reel | Single image, Story |
| 7 | Routine Timeline | Reel | Carousel |
| 8 | Things Nobody Tells You | Reel | Carousel |
| 9 | N-Step How-To | Carousel | Reel slideshow |
| 10 | Myth vs Fact | Carousel | Story (poll sticker) |
| 11 | Mistakes List | Carousel | Reel slideshow |
| 12 | Saveable Checklist | Carousel | Story |
| 13 | Framework / Mental Model | Carousel | Single image |
| 14 | Before / After Comparison | Carousel | Reel |
| 15 | Mini Case Story | Carousel | Reel |
| 16 | Best Apps For X | Carousel | Reel slideshow |
| 17 | Me When Reaction Caption (meme) | Single image | Reel (still), Story |
| 18 | Expectation vs Reality (meme) | Single image or 2-slide carousel | Reel |
| 19 | Choice Meme (meme) | Single image | Reel (still) |
| 20 | Nobody / Me (meme) | Single image | Story |
| 21 | Tell Me You Without Telling Me (meme) | Single image | Story (question sticker) |
| 22 | Problem to App Solution | Reel | Story |
| 23 | What App Is This? | Reel | Story teaser |
| 24 | Hidden Feature Hack | Reel | Carousel (steps) |
| 25 | Result Screenshot Demo | Reel | Carousel (screenshots) |
| 26 | Speed Run | Reel | Story |
| 27 | Old Way vs App Way | Reel | Carousel |
| 28 | Challenge / Streak Series | Reel | Story highlight |
| 29 | This-or-That | Story (poll sticker) | Single image |
| 30 | Insight / Data Drop | Carousel | Single image |
| 31 | Tier List | Carousel (tier reveal) | Reel |
| 32 | Unpopular Opinion / Hot Take | Reel | Single image |
| 33 | Red Flags vs Green Flags | Carousel | Reel |
| 34 | Types of People | Carousel | Reel |
| 35 | Rate Yourself 1-10 | Story (slider sticker) | Single image |
| 36 | Signs You're a [Persona] | Carousel | Reel |
| 37 | Letter to Past Self | Reel | Carousel |
| 38 | Permission Slip | Reel | Carousel |
| 39 | For the Person Who... | Reel | Single image |
| 40 | Fake Chat Conversation | Reel | Carousel |
| 41 | Things I Stopped Doing | Carousel | Reel |
| 42 | Small Wins Celebration | Reel | Story |
| 43 | Jargon Decoder | Carousel | Reel |
| 44 | Cheat Sheet | Carousel | Single image |
| 45 | Copy-Paste Template | Carousel | Reel |
| 46 | Levels 1 to 5 | Carousel | Story |
| 47 | Which Type Are You? (Quiz) | Carousel | Story (quiz sticker) |
| 48 | The Math / Reality Check | Carousel | Reel |
| 49 | FAQ Carousel | Carousel | Story (question box) |
| 50 | Free Alternative to Paid Tools | Reel | Carousel |
| 51 | 60-Second Setup | Reel | Story |
| 52 | You Asked, We Built | Reel | Story |
| 53 | Real Review Spotlight | Single image | Reel, Story |
| 54 | Milestone / Build-in-Public Update | Carousel | Story |
| 55 | Why We Built It | Reel | Carousel |
| 56 | Free Access Drop | Reel | Story |
| 57 | Seasonal Hook | Reel | Carousel |
| 58 | Trend Sound + Text Remix | Reel | None (audio-led) |
| 59 | Breaking-News Style Update | Reel | Single image |
| 60 | Weekly Roundup | Carousel | Reel |
| 61 | Meme Dump Carousel (meme) | Carousel | Reel slideshow |
| 62 | Swipe for the Punchline (meme) | Carousel (2-3 slides) | Reel |
| 63 | Stick-Figure Comic (meme) | Carousel (panels) | Single image |
| 64 | Fake Notification Stack (meme) | Single image | Story, Reel |
| 65 | To-Do List vs Reality (meme) | Single image | Carousel |
| 66 | Alignment Chart (meme) | Single image | Story (poll sticker) |
| 67 | Bell Curve Take (meme) | Single image | Reel |
| 68 | Venn Diagram Meme (meme) | Single image | Carousel |
| 69 | Loading Bar Meme (meme) | Reel (animated bar) | Single image |
| 70 | Satirical Headline (meme) | Single image | Reel |
| 71 | Fake Post Screenshot (meme) | Single image | Carousel |
| 72 | Caption This (meme) | Single image | Story (question sticker) |

## Suggested mix and engine notes

- **Weekly mix per app (about 10 posts):** 3 carousels (B), 3 text-overlay videos (A), 2 hook+demo (D), 1 meme (C), 1 series or engagement post (E).
- **Per-format template fields for your engine:** hook, beats (text lines), visual source type, duration, CTA, caption, hashtags, app placeholders.
- **Quality gate:** generate several hook options per post, score them, and reject any that are generic, self-focused or unverifiable.
- **Learning loop:** tag every post with format and hook type, track saves, shares and installs, then make variations of winners.
