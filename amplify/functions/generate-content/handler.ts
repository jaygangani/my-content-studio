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

const DURATION_OPTIONS = [5, 10, 15, 20] as const;

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

/**
 * Prompts are edited in the Lambda — not passed from the client.
 * `SYSTEM_PROMPT` is extended at runtime with the app's `context` field
 * (Apps model) as reference; `USER_PROMPT` is the generation task.
 */
const SYSTEM_PROMPT = `You are an expert viral content strategist specializing in short-form videos (Reels, TikToks, YouTube Shorts) and social media copy.

YOUR ROLE:
You take the provided app context, target audience, and content intent, and generate a single, execution-ready JSON payload for automated video rendering pipelines and scheduling tools.

RULES FOR CONTENT & TIMING:
1. CRISP & RELATABLE: Avoid corporate marketing buzzwords. Use authentic, conversational language (including Devanagari script for Hindi/Gujarati when requested).
2. TIMING ACCURACY: overlay_text_timeline segments must exactly tile total_video_duration_seconds — the first starts at 0, segments are contiguous (end of one equals start of the next), no gaps or overlaps, the last ends exactly at the total.
3. AMBIENT VISUALS: Provide specific, high-contrast search terms for Pexels b-roll footage.
4. STRICT JSON OUTPUT: Return ONLY valid JSON matching the requested schema. No prose, no markdown wrappers, no introductory or trailing text.
5. CHOSEN ANGLE: A selected video angle is appended at the end of this prompt. Match post_metadata.angle to it exactly, derive overlay text, hooks, search_keywords, and visual_description from its visual vibe, set motion_style to its pacing, and keep every copy decision aligned to it.
6. CHOSEN DURATION: A total_video_duration_seconds value is appended at the end of this prompt. Set timing_config to exactly that value and tile overlay_text_timeline segments to it contiguously (first starts at 0, last ends exactly at the total).
7. OVERLAY CRAFT: overlay_text_timeline text must be CRISP, PUNCHY, CONVERSATIONAL, and HOOK-DRIVEN. Plain spoken language, no corporate/generic filler. Segment 1 is the scroll-stopping hook — a question, a bold claim, or a relatable confession. Punctuation (—, ?, !, …) carries rhythm.`;

const USER_PROMPT = `Generate one content draft for the app described in the context.
Follow the selected angle and selected duration in the system prompt — the hook, overlays, visuals, pacing, and timing must all serve them.
Pick the best content type for the idea, a scroll-stopping hook, an authentic caption with a few tasteful emojis, 5-8 relevant hashtags, 3-6 Pexels search keywords, and a one-line relatability scenario.
Write 2-3 overlay segments with crisp, hook-first wording that teases, provokes, or speaks the audience's own language — tile them to the selected duration, and mirror the exact overlay text in full_static_overlay_string (one line break per segment).`;

type ContentType = (typeof CONTENT_TYPES)[number];

type OverlaySegment = {
  segment_id: number;
  text: string;
  start_time_sec: number;
  end_time_sec: number;
  duration_sec: number;
  screen_position: string;
};

type GeneratedPayload = {
  post_metadata: {
    short_title: string;
    content_type: ContentType;
    angle: string;
    angle_rationale: string;
    target_persona: string;
    relatability_hook_scenario: string;
  };
  timing_config: {
    total_video_duration_seconds: number;
    loop_friendly: boolean;
  };
  overlay_text_timeline: OverlaySegment[];
  full_static_overlay_string: string;
  rendering_styling: {
    text_position: string;
    font_style: string;
    text_box_bg: string;
    primary_brand_hex: string;
    highlight_words: string[];
  };
  audio_config: {
    sound_type: string;
    track_vibe: string;
  };
  video_api_config: {
    search_keywords: string[];
    orientation: string;
    motion_style: string;
    visual_description: string;
    dark_overlay_opacity: string;
  };
  distribution: {
    caption: string;
    hashtags: string[];
    platform_notes: { reels: string; shorts: string; tiktok: string };
  };
};

const GENERATED_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  strict: true,
  properties: {
    post_metadata: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        short_title: { type: 'string' },
        content_type: { type: 'string', enum: [...CONTENT_TYPES] },
        angle: { type: 'string' },
        angle_rationale: { type: 'string' },
        target_persona: { type: 'string' },
        relatability_hook_scenario: { type: 'string' },
      },
      required: [
        'short_title',
        'content_type',
        'angle',
        'angle_rationale',
        'target_persona',
        'relatability_hook_scenario',
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
          screen_position: { type: 'string' },
        },
        required: [
          'segment_id',
          'text',
          'start_time_sec',
          'end_time_sec',
          'duration_sec',
          'screen_position',
        ],
      },
    },
    full_static_overlay_string: { type: 'string' },
    rendering_styling: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        text_position: { type: 'string' },
        font_style: { type: 'string' },
        text_box_bg: { type: 'string' },
        primary_brand_hex: { type: 'string' },
        highlight_words: { type: 'array', items: { type: 'string' } },
      },
      required: [
        'text_position',
        'font_style',
        'text_box_bg',
        'primary_brand_hex',
        'highlight_words',
      ],
    },
    audio_config: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        sound_type: { type: 'string' },
        track_vibe: { type: 'string' },
      },
      required: ['sound_type', 'track_vibe'],
    },
    video_api_config: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        search_keywords: { type: 'array', items: { type: 'string' } },
        orientation: { type: 'string' },
        motion_style: { type: 'string' },
        visual_description: { type: 'string' },
        dark_overlay_opacity: { type: 'string' },
      },
      required: [
        'search_keywords',
        'orientation',
        'motion_style',
        'visual_description',
        'dark_overlay_opacity',
      ],
    },
    distribution: {
      type: 'object',
      additionalProperties: false,
      strict: true,
      properties: {
        caption: { type: 'string' },
        hashtags: { type: 'array', items: { type: 'string' } },
        platform_notes: {
          type: 'object',
          additionalProperties: false,
          strict: true,
          properties: {
            reels: { type: 'string' },
            shorts: { type: 'string' },
            tiktok: { type: 'string' },
          },
          required: ['reels', 'shorts', 'tiktok'],
        },
      },
      required: ['caption', 'hashtags', 'platform_notes'],
    },
  },
  required: [
    'post_metadata',
    'timing_config',
    'overlay_text_timeline',
    'full_static_overlay_string',
    'rendering_styling',
    'audio_config',
    'video_api_config',
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
      temperature: 0.7,
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
function toContentDraft(payload: GeneratedPayload, angle: VideoAngle): {
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
  const videoKeywords = asStringArray(payload.video_api_config.search_keywords);
  const highlightWords = asStringArray(
    payload.rendering_styling.highlight_words,
  );
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
    relatabilityHook: nullableString(
      payload.post_metadata.relatability_hook_scenario,
    ),
    angel: nullableString(payload.post_metadata.angle),
    overlayText: JSON.stringify({
      overlay_text_timeline: payload.overlay_text_timeline,
      full_static_overlay_string: payload.full_static_overlay_string,
    }),
    videoConfigurations: JSON.stringify({
      duration,
      loop_friendly: payload.timing_config.loop_friendly,
      angle_vibe: angle.vibe,
      angle_visual: angle.visual,
      angle_pacing: angle.pacing,
      angle_rationale: nullableString(payload.post_metadata.angle_rationale) ?? '',
      text_position: payload.rendering_styling.text_position,
      font_style: payload.rendering_styling.font_style,
      text_box_bg: payload.rendering_styling.text_box_bg,
      primary_brand_hex: payload.rendering_styling.primary_brand_hex,
      highlight_words: highlightWords,
      search_keywords: videoKeywords,
      orientation: payload.video_api_config.orientation,
      motion_style: payload.video_api_config.motion_style,
      visual_description: payload.video_api_config.visual_description,
      dark_overlay_opacity: payload.video_api_config.dark_overlay_opacity,
    }),
    audioConfig: JSON.stringify(payload.audio_config),
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

    const angle =
      VIDEO_ANGLES[Math.floor(Math.random() * VIDEO_ANGLES.length)];
    const duration =
      DURATION_OPTIONS[Math.floor(Math.random() * DURATION_OPTIONS.length)];
    const systemPrompt = [
      SYSTEM_PROMPT,
      app.context ? `App context:\n${app.context}` : null,
      `SELECTED ANGLE FOR THIS DRAFT:\nAngle: ${angle.angle}\nVisual vibe: ${angle.vibe}\nVisual: ${angle.visual}\nPacing: ${angle.pacing}`,
      `SELECTED DURATION FOR THIS DRAFT (seconds): ${duration}`,
    ]
      .filter((part): part is string => Boolean(part))
      .join('\n\n');

    const generated = await generateWithOpenAI(apiKey, model, systemPrompt, type);
    const draft = toContentDraft(generated, angle);

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
