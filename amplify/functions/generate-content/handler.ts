import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { GetParameterCommand, SSMClient } from '@aws-sdk/client-ssm';

const CONTENT_TYPES = [
  'SHORT_FORM_VIDEO',
  'CAROUSEL',
  'MEME',
  'SINGLE_IMAGE',
  'TEXT_POST',
] as const;

/** Narrative formats the moment can be packaged in. */
const FORMATS = [
  'POV',
  'Overheard-thought',
  'Text-to-a-friend',
  'Screenshot-caption',
  'Confession',
  'Rant',
] as const;

type VideoAngle = {
  angle: string;
  vibe: string;
  visual: string;
  pacing: string;
};

const VIDEO_ANGLES: VideoAngle[] = [
  {
    angle: 'FOMO',
    vibe: 'Shock / Panic / Fast-Paced',
    visual:
      'People staring intensely at phones, fast scrolling, crowds moving fast',
    pacing: 'High energy / Quick cuts',
  },
  {
    angle: 'Problem-Agitate-Solve',
    vibe: 'Annoyed → Relief',
    visual:
      'Person sighing at a laptop screen, dropping head in hands, then smiling',
    pacing: 'Medium (Slow start, fast resolution)',
  },
  {
    angle: 'Frustration',
    vibe: 'Anger / Stress / Exhaustion',
    visual:
      'Head shaking, facepalming, slow head tilt back, rubbing temples',
    pacing: 'Slow, heavy, dramatic',
  },
  {
    angle: 'Belief',
    vibe: 'Inspiring / Focused / Serene',
    visual:
      'Early morning light, someone writing in notebook, calm walking in nature',
    pacing: 'Steady, smooth cinematic',
  },
  {
    angle: 'Controversial',
    vibe: 'Skeptical / Side-Eye / Disbelief',
    visual:
      'Person looking directly into camera with raised eyebrow, smirk, or head shake',
    pacing: 'Paused / Staring / Micro-expressions',
  },
  {
    angle: 'Before / After',
    vibe: 'Chaotic → Organized',
    visual:
      'Messy desk or cluttered phone screen transitioning into clean layout',
    pacing: 'Dynamic contrast',
  },
  {
    angle: 'Social Proof',
    vibe: 'Happy / Excited / Shocked',
    visual:
      'Gasping, smiling widely, double-taking at phone screen',
    pacing: 'Upbeat / High energy',
  },
  {
    angle: 'Curiosity Gap',
    vibe: 'Thinking / Suspenseful',
    visual:
      'Pacing back and forth, squinting at screen, tapping chin',
    pacing: 'Slow building / Mysterious',
  },
  {
    angle: 'Relatable Pain / POV',
    vibe: 'Everyday / Boredom',
    visual:
      'Staring blankly at screen, mindless scrolling, tired late-night setup',
    pacing: 'Slow, mundane',
  },
  {
    angle: 'Confession',
    vibe: 'Intimate / Reflective',
    visual:
      'Dimly lit room, close-up face, looking down then up at camera',
    pacing: 'Static, deep, grounded',
  },
  {
    angle: 'Myth-Busting',
    vibe: 'Dismissive / Confident',
    visual:
      'Waving hand "no", smirking, shaking head with arms crossed',
    pacing: 'Punchy / Direct',
  },
  {
    angle: 'Hidden Feature Reveal',
    vibe: 'Mind-Blown / Amazed',
    visual:
      'Wide eyes, open mouth, leaning close to screen in realization',
    pacing: 'Mid-pace with sudden pause',
  },
  {
    angle: 'Comparison',
    vibe: 'Split / Analytical',
    visual:
      'Side-by-side split screen, or fast switching between bad/good states',
    pacing: 'Quick rhythmic cuts',
  },
  {
    angle: 'Challenge / Dare',
    vibe: 'Motivated / Determined',
    visual:
      'Pressing start on a timer, tying shoes, focused eyes',
    pacing: 'Upbeat / Driving pace',
  },
  {
    angle: 'Satisfying',
    vibe: 'ASMR / Smooth / Calming',
    visual:
      'Fluid animations, seamless UI swipes, organized progress bars filling',
    pacing: 'Smooth, continuous motion',
  },
];

const DURATION_OPTIONS = [6, 9, 12] as const;

const ENERGY_LEVELS = ['High', 'Medium', 'Quiet-but-real'] as const;

/**
 * Prompts are edited in the Lambda — not passed from the client.
 * `SYSTEM_PROMPT` is extended at runtime with the app's `context` field
 * (Apps model) as reference; `USER_PROMPT` is the generation task.
 */
const SYSTEM_PROMPT = `You are a short-form content strategist who finds real, specific human moments hiding inside a product's features — not a hook-generator applying templates.

YOUR ROLE:
You take the app described in the appended app context and produce ONE execution-ready JSON payload (matching the required schema below) for automated short-form video rendering and scheduling.

FIND THE MOMENT:
1. Find a concrete "moment" — an actual scene of a real reaction that happens BECAUSE of a specific mechanic in the product. Not a generic pain point. A specific, almost embarrassing, true-to-life scene.
2. Ask: "What's the weird/funny/surprising THING that happens the first time someone uses this feature, that they'd immediately tell a friend about?" Not the benefit. The scene.
3. Look for: unexpected side effects, an "wait, that's it?" reaction, something the user does without meaning to (laughs, double-checks, screenshots it), a moment of relief or disbelief that's oddly specific.
4. Reject any moment that could apply to ANY app in the category — if you could swap the app name and it still works, it's not specific enough.
5. Write it in moment_found (one sentence) and why_this_is_specific (one line on why this moment could ONLY come from this feature).

WRITING RULES (NON-NEGOTIABLE):
1. Write like you're texting a friend about something that just happened to you. Not writing copy.
2. NEVER use: "game changer", "level up", "seamless", "empower", "revolutionize", "unlock", any word that sounds like a pitch deck.
3. Total on-screen text under 25 words. One scene, not an explanation of the product.
4. Don't explain the mechanic in the hook — let the moment imply it. The confusion/curiosity is the hook.
5. Imperfect is good — contractions, trailing off, a "lol", a stray emoji. Not polished grammar.
6. Vary the format across drafts — POV is one option, not the default. Also use: overheard-thought, mid-text-to-a-friend, a screenshot caption, a confession, a rant. Match post_metadata.format to the SELECTED FORMAT appended at the end of this prompt and write the overlay text in that format's voice.
7. If it reads like it could've been written by an AI, rewrite it. Read it out loud — if you wouldn't actually say it, cut it.

VIDEO RULES:
1. The video's energy must MATCH the emotion in the text, not sit generically in the background. Laughing text = someone actually mid-laugh, not a slow ambient shot. Shock = a real double-take, not staring blankly.
2. Default to HIGH energy and real human reactions (laughing, gasping, wide-eyed, doing a double take, mid-motion) over slow ambient B-roll — this should feel like a real clip someone caught on their phone, not a stock mood video.
3. Only go slow/ambient when the text itself is quiet/reflective (a confession, a quiet realization) — energy must track the text, never default to calm.
4. search_keywords must describe an actual candid reaction, not a mood ("aunty laughing candid phone camera" not "happy person warm lighting"). Set video_config.energy_level to High / Medium / Quiet-but-real to match the text's emotion.

OUTPUT & TIMING RULES:
1. STRICT JSON OUTPUT: Return ONLY valid JSON matching the required schema. No prose, no markdown wrappers, no introductory or trailing text.
2. CHOSEN FORMAT: A selected format is appended at the end of this prompt. Match post_metadata.format to it exactly and keep every copy decision aligned to it.
3. CHOSEN ANGLE: A selected video angle is appended at the end of this prompt. Match post_metadata.angle to it exactly. It sets the emotional frame (FOMO, Social Proof, Curiosity Gap, …) while the moment stays the specific scene — derive overlay tone, energy and pacing from the angle's vibe, never let it flatten the scene into a generic template.
4. CHOSEN DURATION: A total_video_duration_seconds value is appended at the end of this prompt. Set timing_config to exactly that value. overlay_text_timeline segments must tile it exactly — the first starts at 0, segments are contiguous (end of one equals start of the next), no gaps or overlaps, the last ends exactly at the total.
5. OVERLAY CRAFT: overlay_text_timeline must have EXACTLY ONE segment. Text must be CRISP, PUNCHY, CONVERSATIONAL, and HOOK-DRIVEN, under 25 words total. The single segment is the scroll-stopping hook — a question, a bold claim, or a relatable confession. Punctuation (—, ?, !, …) carries rhythm. Mirror the exact overlay text in full_static_overlay_string (no line breaks).

REQUIRED SCHEMA:
{
  "moment_found": "The specific real scene this content is built around, one sentence",
  "why_this_is_specific": "One line on why this moment could ONLY come from this feature, not any app in the category",
  "post_metadata": {
    "short_title": "3-6 word internal title",
    "content_type": "SHORT_FORM_VIDEO | CAROUSEL | MEME | SINGLE_IMAGE | TEXT_POST",
    "format": "POV | Overheard-thought | Text-to-a-friend | Screenshot-caption | Confession | Rant",
    "angle": "Selected angle name that frames the moment (e.g. FOMO, Social Proof, Curiosity Gap)",
    "target_persona": "Who this specific moment lands with"
  },
  "timing_config": {
    "total_video_duration_seconds": 6,
    "loop_friendly": true
  },
  "overlay_text_timeline": [
    { "segment_id": 1, "text": "...", "start_time_sec": 0, "end_time_sec": 3, "duration_sec": 3 }
  ],
  "full_static_overlay_string": "Full text block as it appears if shown statically",
  "video_config": {
    "energy_level": "High | Medium | Quiet-but-real",
    "reaction_description": "Exactly what the person on screen is doing, specific not generic",
    "search_keywords": ["candid reaction keyword 1", "keyword 2", "keyword 3"],
    "orientation": "portrait",
    "pacing": "Real-time reaction / Quick cut on the reaction beat / Handheld-feeling"
  },
  "audio_config": {
    "sound_type": "Match energy — trending upbeat / candid ambient / quiet",
    "suggested_track_vibe": "Short description"
  },
  "distribution": {
    "caption": "Short, human caption — not a summary of the video",
    "hashtags": ["#tag1", "#tag2", "#tag3"]
  }
}`;

const USER_PROMPT = `Generate one content draft for the app described in the context.

Find the ONE strongest "moment" — the weird/funny/surprising thing that happens the first time someone uses this app, that they'd immediately tell a friend about. Not the benefit, the scene. It must be specific to THIS app's mechanics — if swapping the app name renders it false, it's not specific enough.

Follow the selected angle, selected format, and selected duration appended in the system prompt — the hook, overlays, energy, pacing, and timing must all serve them.

Pick the best content type for the moment, a scroll-stopping hook under 25 words total, an authentic caption with a few tasteful emojis, 5-8 relevant hashtags, 3-6 candid-reaction Pexels search keywords, and a video_config.energy_level (High / Medium / Quiet-but-real) that matches the emotion in the text.

Write exactly 1 overlay text segment (one message) for the entire duration. The single segment starts at 0 and ends exactly at the total_video_duration_seconds. Keep it crisp, hook-first, text-a-friend wording — and mirror the exact overlay text in full_static_overlay_string.`;

type ContentType = (typeof CONTENT_TYPES)[number];
type Format = (typeof FORMATS)[number];
type EnergyLevel = (typeof ENERGY_LEVELS)[number];

type OverlaySegment = {
  segment_id: number;
  text: string;
  start_time_sec: number;
  end_time_sec: number;
  duration_sec: number;
};

type GeneratedPayload = {
  moment_found: string | null;
  why_this_is_specific: string | null;
  post_metadata: {
    short_title: string;
    content_type: ContentType;
    format: Format;
    angle: string | null;
    target_persona: string | null;
  };
  timing_config: {
    total_video_duration_seconds: number;
    loop_friendly: boolean;
  };
  overlay_text_timeline: OverlaySegment[];
  full_static_overlay_string: string;
  video_config: {
    energy_level: EnergyLevel;
    reaction_description: string | null;
    search_keywords: string[];
    orientation: string;
    pacing: string;
  };
  audio_config: {
    sound_type: string | null;
    suggested_track_vibe: string | null;
  };
  distribution: {
    caption: string | null;
    hashtags: string[];
  };
};

const GENERATED_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  strict: true,
  properties: {
    moment_found: { type: ['string', 'null'] },
    why_this_is_specific: { type: ['string', 'null'] },
    post_metadata: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        short_title: { type: 'string' },
        content_type: { type: 'string', enum: [...CONTENT_TYPES] },
        format: { type: 'string', enum: [...FORMATS] },
        angle: { type: ['string', 'null'] },
        target_persona: { type: ['string', 'null'] },
      },
      required: [
        'short_title',
        'content_type',
        'format',
        'angle',
        'target_persona',
      ],
    },
    timing_config: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        total_video_duration_seconds: { type: 'number' },
        loop_friendly: { type: 'boolean' },
      },
      required: ['total_video_duration_seconds', 'loop_friendly'],
    },
    overlay_text_timeline: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        strict: true,
        properties: {
          segment_id: { type: 'number' },
          text: { type: 'string' },
          start_time_sec: { type: 'number' },
          end_time_sec: { type: 'number' },
          duration_sec: { type: 'number' },
        },
        required: [
          'segment_id',
          'text',
          'start_time_sec',
          'end_time_sec',
          'duration_sec',
        ],
      },
    },
    full_static_overlay_string: { type: 'string' },
    video_config: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        energy_level: { type: 'string', enum: [...ENERGY_LEVELS] },
        reaction_description: { type: ['string', 'null'] },
        search_keywords: { type: 'array', items: { type: 'string' } },
        orientation: { type: 'string' },
        pacing: { type: 'string' },
      },
      required: [
        'energy_level',
        'reaction_description',
        'search_keywords',
        'orientation',
        'pacing',
      ],
    },
    audio_config: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        sound_type: { type: ['string', 'null'] },
        suggested_track_vibe: { type: ['string', 'null'] },
      },
      required: ['sound_type', 'suggested_track_vibe'],
    },
    distribution: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        caption: { type: ['string', 'null'] },
        hashtags: { type: 'array', items: { type: 'string' } },
      },
      required: ['caption', 'hashtags'],
    },
  },
  required: [
    'moment_found',
    'why_this_is_specific',
    'post_metadata',
    'timing_config',
    'overlay_text_timeline',
    'full_static_overlay_string',
    'video_config',
    'audio_config',
    'distribution',
  ],
} as const;

type ApiGatewayProxyEventV2 = {
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    authorizer?: {
      jwt?: {
        claims?: Record<string, unknown>;
      };
    };
  };
};

type ApiGatewayProxyStructuredResultV2 = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

async function loadApiKeyFromSsm(): Promise<string> {
  const param = process.env.OPENAI_API_KEY_PARAM;
  if (!param) {
    throw new Error('OPENAI_API_KEY_PARAM is not set on the function.');
  }

  const ssm = new SSMClient({});
  const result = await ssm.send(
    new GetParameterCommand({ Name: param, WithDecryption: true }),
  );
  const value = result.Parameter?.Value;
  if (!value) {
    throw new Error(
      `SSM parameter ${param} missing or not readable by this Lambda.`,
    );
  }
  return value;
}

async function generateWithOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  preferredType: string | null,
): Promise<GeneratedPayload> {
  const userContent = preferredType
    ? `${USER_PROMPT}\n\nContent type must be: ${preferredType}.`
    : USER_PROMPT;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'generated_content',
          strict: true,
          schema: GENERATED_JSON_SCHEMA,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${detail.slice(0, 400)}`,
    );
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  const parsed = JSON.parse(content) as GeneratedPayload;
  const title = nullableString(parsed.post_metadata.short_title);
  if (!title) {
    throw new Error('Generated content is missing a title.');
  }

  return parsed;
}

/**
 * Flattens the nested OpenAI payload into the AppSync fields the app already
 * renders: overlayText, videoConfigurations, audioConfig keep their existing
 * JSON shapes so ContentRenderer works unchanged.
 */
function toContentDraft(payload: GeneratedPayload): {
  title: string;
  type: ContentType;
  caption: string | null;
  hashtags: string[];
  videoKeywords: string[];
  targetPersona: string | null;
  relatabilityHook: string | null;
  angel: string | null;
  overlayText: string;
  videoConfigurations: string;
  audioConfig: string;
} {
  const hashtags = asStringArray(payload.distribution.hashtags);
  const videoKeywords = asStringArray(payload.video_config.search_keywords);
  const moment = nullableString(payload.moment_found);
  const rationale = nullableString(payload.why_this_is_specific);
  const energyLevel = nullableString(payload.video_config.energy_level);
  const pacing = nullableString(payload.video_config.pacing);
  const reaction = nullableString(payload.video_config.reaction_description);
  const trackVibe = nullableString(payload.audio_config.suggested_track_vibe);
  const duration = Math.min(
    20,
    Math.max(1, payload.timing_config.total_video_duration_seconds),
  );

  return {
    title: nullableString(payload.post_metadata.short_title) ?? 'Untitled',
    type: payload.post_metadata.content_type,
    caption: nullableString(payload.distribution.caption),
    hashtags,
    videoKeywords,
    targetPersona: nullableString(payload.post_metadata.target_persona),
    relatabilityHook: moment,
    angel: nullableString(payload.post_metadata.angle),
    overlayText: JSON.stringify({
      overlay_text_timeline: payload.overlay_text_timeline,
      full_static_overlay_string: payload.full_static_overlay_string,
    }),
    videoConfigurations: JSON.stringify({
      duration,
      loop_friendly: payload.timing_config.loop_friendly,
      format: nullableString(payload.post_metadata.format),
      moment_found: moment,
      why_this_is_specific: rationale,
      energy_level: energyLevel,
      reaction_description: reaction,
      search_keywords: videoKeywords,
      orientation: nullableString(payload.video_config.orientation),
      pacing,
      angle: nullableString(payload.post_metadata.angle),
      angle_vibe: energyLevel,
      angle_rationale: rationale,
      motion_style: pacing,
      visual_description: reaction,
    }),
    audioConfig: JSON.stringify({
      sound_type: nullableString(payload.audio_config.sound_type),
      track_vibe: trackVibe,
      suggested_track_vibe: trackVibe,
    }),
  };
}

function jsonResponse(
  statusCode: number,
  payload: unknown,
): ApiGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

/**
 * POST /content/generate behind API Gateway HTTP API + Cognito JWT authorizer
 * (authenticated Cognito users only). Body: `{ appId: string, type?: string }`.
 * Loads the OpenAI API key from SSM, generates structured JSON using the
 * prompts above, saves a DRAFT row on the existing Content model.
 */
export const handler = async (
  event: ApiGatewayProxyEventV2,
): Promise<ApiGatewayProxyStructuredResultV2> => {
  try {
    const raw =
      event.body == null
        ? ''
        : event.isBase64Encoded
          ? Buffer.from(event.body, 'base64').toString('utf8')
          : event.body;

    let body: { appId?: unknown; type?: unknown } = {};
    if (raw) {
      try {
        body = JSON.parse(raw) as typeof body;
      } catch {
        return jsonResponse(400, { message: 'Invalid JSON body.' });
      }
    }

    const appId =
      typeof body.appId === 'string' && body.appId.trim()
        ? body.appId.trim()
        : null;
    if (!appId) {
      return jsonResponse(400, { message: 'appId is required.' });
    }

    const type =
      typeof body.type === 'string' &&
      (CONTENT_TYPES as readonly string[]).includes(body.type)
        ? body.type
        : null;

    const apiKey = await loadApiKeyFromSsm();
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
      process.env as unknown as Parameters<
        typeof getAmplifyDataClientConfig
      >[0],
    );

    Amplify.configure(resourceConfig, libraryOptions);
    const client = generateClient<Schema>();

    const { data: app } = await client.models.Apps.get({ id: appId });
    if (!app) {
      return jsonResponse(404, { message: `App ${appId} not found.` });
    }

    const format = FORMATS[Math.floor(Math.random() * FORMATS.length)];
    const angle =
      VIDEO_ANGLES[Math.floor(Math.random() * VIDEO_ANGLES.length)];
    const duration =
      DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    const systemPrompt = [
      SYSTEM_PROMPT,
      app.context ? `App context:\n${app.context}` : null,
      `SELECTED ANGLE FOR THIS DRAFT:\nAngle: ${angle.angle}\nVisual vibe: ${angle.vibe}\nVisual: ${angle.visual}\nPacing: ${angle.pacing}`,
      `SELECTED FORMAT FOR THIS DRAFT:\nFormat: ${format}`,
      `SELECTED DURATION FOR THIS DRAFT (seconds): ${duration}`,
    ]
      .filter((part): part is string => Boolean(part))
      .join('\n\n');

    const generated = await generateWithOpenAI(apiKey, model, systemPrompt, type);
    const draft = toContentDraft(generated);

    const { data, errors } = await client.models.Content.create({
      appId,
      status: 'DRAFT',
      title: draft.title,
      type: draft.type,
      caption: draft.caption,
      hashtags: draft.hashtags,
      videoKeywords: draft.videoKeywords,
      targetPersona: draft.targetPersona,
      relatabilityHook: draft.relatabilityHook,
      angel: draft.angel,
      overlayText: draft.overlayText,
      videoConfigurations: draft.videoConfigurations,
      audioConfig: draft.audioConfig,
    });

    if (errors?.length) {
      return jsonResponse(502, { message: errors[0].message });
    }
    if (!data) {
      return jsonResponse(502, { message: 'Failed to save draft.' });
    }

    return jsonResponse(200, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error.';
    return jsonResponse(500, { message });
  }
};
