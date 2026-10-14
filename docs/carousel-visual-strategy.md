# Carousel visual strategy

Applies to every carousel format (1080 x 1350, 4:5). Enforced in code through
`stockPolicy` on the format (admin screen `/admin/formats`, seeded from
`scripts/seed-data/format-overrides.json`)
(prompt rules, validation, editor options and the quality checklist).

## Image source order

1. **Product screenshots** in a phone frame (only when the feature has an
   upload).
2. **Custom graphics**: icons, big-number data cards, decor shapes in brand
   colours.
3. **Brand-colour typography only**. This is the default and the strongest
   option for text-heavy slides.
4. **Stock photo**: last resort, only where the format policy below allows it.
   Always under a brand-colour overlay, text on a solid area, never over the
   photo.

## Stock photo policy

| Policy | Meaning |
| --- | --- |
| `never` | No stock photo on any slide. The generator is told stock is not allowed, validation rejects it, the editor hides the option, the checklist flags a manual change. |
| `allowed` | One stock photo, slide 1 only, when a real scene helps the hook. Optional. |
| `preferred` | The generator is told to use a stock photo on slide 1 (a concrete real-world scene). Still one photo, slide 1 only, under the brand overlay. |

### Preferred (6 formats)

| # | Format | Why |
| --- | --- | --- |
| 15 | Mini Case Story | A story needs a human or scene mood on the hook. |
| 34 | Types of People | One mood image sets the "people" theme; the type cards stay typographic. |
| 36 | Signs You're a [Persona] | A relatable scene makes the persona recognisable at a glance. |
| 41 | Things I Stopped Doing | A real-life scene anchors the "I stopped" confession. |
| 47 | Which Type Are You? (Quiz) | A friendly scene invites the tap-through. |
| 61 | Meme Dump Carousel | Meme hooks lean on a recognisable scene. |

### Allowed (6 formats)

| # | Format | Why |
| --- | --- | --- |
| 9 | N-Step How-To | A scene of the task makes the hook concrete. |
| 11 | Mistakes List | A scene of the mistake in action. |
| 12 | Saveable Checklist | A scene of the routine the list is for. |
| 49 | FAQ Carousel | A person asking or thinking sets the Q and A mood. |
| 60 | Weekly Roundup | A scene of the week or topic. |
| 62 | Swipe for the Punchline | The setup scene before the swipe. |

### Never (14 formats)

| # | Format | Preferred visual |
| --- | --- | --- |
| 10 | Myth vs Fact | Typography, split labels |
| 13 | Framework / Mental Model | Typography, icons |
| 14 | Before / After Comparison | Screenshots |
| 16 | Best Apps For X | Screenshots |
| 30 | Insight / Data Drop | Big-number data card |
| 31 | Tier List | Typography |
| 33 | Red Flags vs Green Flags | Flag chips |
| 43 | Jargon Decoder | Typography, icons |
| 44 | Cheat Sheet | Grid cells |
| 45 | Copy-Paste Template | Template card |
| 46 | Levels 1 to 5 | Level bars |
| 48 | The Math / Reality Check | Big-number data card |
| 54 | Milestone / Build-in-Public Update | Big-number data card, timeline |
| 63 | Stick-Figure Comic | Drawn panels, typography |

Reason for "never": these formats are structural (comparisons, numbers,
templates, data) so a photo adds noise and weakens contrast and consistency.
Only slide 1 ever carries a photo; value slides stay typographic, so the layout
library and brand look stay consistent.

## Changing the policy

Set the format's **Stock photo** field in `/admin/formats` (`never`,
`allowed` or `preferred`; unspecified carousels default to `never`). No code
change or deploy needed.

## Layout library (15 designs)

Every carousel uses one layout, chosen by its content format, so a feed of
carousels does not look the same. All layouts share the brand kit: colours and
tonal ramps, the two fonts, logo corner, 80px margins and the app's visual
style. Hook and CTA slides keep the shared cover and closing design.

| Layout | Look | Formats |
| --- | --- | --- |
| steps | Big step number, headline, detail | 9 |
| checklist | Checkbox marker per item | 12, 36 |
| split | Two side-by-side panels with labels | 10, 14 |
| stat | One huge number with a label | 30, 48 |
| quote | Oversized quote mark, bold statement | 41 |
| tier | Tier letter badge with item chips | 31 |
| cards | Numbered card with title and detail | 13, 16, 34, 47 |
| chat | Question and answer bubbles | 49, 63 |
| level | Progress segments with a level name | 46 |
| timeline | Vertical rail with a time label | 54, 60 |
| grid | 2 x 2 cheat-sheet cells | 44 |
| flags | Green or red flag chip | 11, 33 |
| editorial | Outlined chapter number, rule, body with side line | 15 |
| template | Dashed copy card with highlighted [fill-ins] | 43, 45 |
| poster | Accent colour block with a huge line | 61, 62 |

The layout is the `variant` field in `format-overrides.json`. Each layout also
has fill instructions in the Lambda prompt (what goes in headline, body,
`stat_label`, `icon`) and light validation (for example `split` needs
`left || right`).
