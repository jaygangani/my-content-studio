import type { IgFormat } from './catalog';

export interface ReelBeat {
  text: string;
  seconds: number;
  visual_query: string;
}

export interface ReelPayload {
  skip: string;
  hook_options: string[];
  hook: string;
  beats: ReelBeat[];
  cta: string;
  caption: string;
  hashtags: string[];
  audio_mood: string;
  total_seconds: number;
}

export interface CarouselSlide {
  role: string;
  headline: string;
  body: string;
  visual: string;
  visual_type: string;
  icon: string;
  stat_value: string;
  stat_label: string;
}

export interface CarouselPayload {
  skip: string;
  hook_options: string[];
  slides: CarouselSlide[];
  caption: string;
  hashtags: string[];
}

export interface ImagePayload {
  skip: string;
  hook_options: string[];
  text_lines: string[];
  visual: string;
  caption: string;
  hashtags: string[];
}

export interface StoryFrame {
  text: string;
  sticker: string;
  sticker_text: string;
  options: string[];
}

export interface StoryPayload {
  skip: string;
  frames: StoryFrame[];
  caption_note: string;
}

export interface MemeLinesPayload {
  skip: string;
  lines: string[];
  caption: string;
  hashtags: string[];
  bg_query: string;
}

export type GeneratedPayload =
  | ReelPayload
  | CarouselPayload
  | ImagePayload
  | StoryPayload
  | MemeLinesPayload;

type JsonSchema = Record<string, unknown>;

const str: JsonSchema = { type: 'string' };
const strArray: JsonSchema = { type: 'array', items: str };

function obj(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: 'object',
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

export const SCHEMAS: Record<IgFormat, JsonSchema> = {
  REEL: obj({
    skip: str,
    hook_options: strArray,
    hook: str,
    beats: {
      type: 'array',
      items: obj({
        text: str,
        seconds: { type: 'number' },
        visual_query: str,
      }),
    },
    cta: str,
    caption: str,
    hashtags: strArray,
    audio_mood: str,
    total_seconds: { type: 'number' },
  }),
  CAROUSEL: obj({
    skip: str,
    hook_options: strArray,
    slides: {
      type: 'array',
      items: obj({
        role: str,
        headline: str,
        body: str,
        visual: str,
        visual_type: str,
        icon: str,
        stat_value: str,
        stat_label: str,
      }),
    },
    caption: str,
    hashtags: strArray,
  }),
  IMAGE: obj({
    skip: str,
    hook_options: strArray,
    text_lines: strArray,
    visual: str,
    caption: str,
    hashtags: strArray,
  }),
  STORY: obj({
    skip: str,
    frames: {
      type: 'array',
      items: obj({
        text: str,
        sticker: str,
        sticker_text: str,
        options: strArray,
      }),
    },
    caption_note: str,
  }),
};

export const MEME_SCHEMA: JsonSchema = obj({
  skip: str,
  lines: strArray,
  caption: str,
  hashtags: strArray,
  bg_query: str,
});
