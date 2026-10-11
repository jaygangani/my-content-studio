import type { FormatEntry } from './catalog';
import type {
  CarouselPayload,
  GeneratedPayload,
  ImagePayload,
  ReelPayload,
  StoryPayload,
} from './schemas';

export const REEL_MIN_SECONDS = 15;
export const REEL_MAX_SECONDS = 30;
const BEAT_HARD_MIN_WORDS = 3;
const BEAT_HARD_MAX_WORDS = 12;

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function collectText(
  igFormat: FormatEntry['igFormat'],
  payload: GeneratedPayload,
): string[] {
  switch (igFormat) {
    case 'REEL': {
      const p = payload as ReelPayload;
      return [p.hook, ...p.beats.map((b) => b.text), p.cta, p.caption, ...p.hashtags];
    }
    case 'CAROUSEL': {
      const p = payload as CarouselPayload;
      return [
        ...p.slides.flatMap((s) => [s.headline, s.body]),
        p.caption,
        ...p.hashtags,
      ];
    }
    case 'IMAGE': {
      const p = payload as ImagePayload;
      return [...p.text_lines, p.caption, ...p.hashtags];
    }
    case 'STORY': {
      const p = payload as StoryPayload;
      return [
        ...p.frames.flatMap((f) => [f.text, f.sticker_text, ...f.options]),
        p.caption_note,
      ];
    }
  }
}

export function parseBannedWords(voice: Record<string, string>): string[] {
  return (voice?.bannedWords ?? '')
    .split(/[,\n]/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Structural checks from FR-3.4. Returns human-readable problems. */
export function validatePayload(
  format: FormatEntry,
  payload: GeneratedPayload,
  bannedWords: string[],
): string[] {
  const problems: string[] = [];

  if (format.igFormat === 'REEL') {
    const p = payload as ReelPayload;
    if (!p.hook?.trim()) problems.push('hook is empty');
    else if (words(p.hook) > 8) problems.push('hook is longer than 8 words');
    if (!Array.isArray(p.beats) || p.beats.length < 3) {
      problems.push('reel needs at least 3 beats');
    } else {
      p.beats.forEach((beat, i) => {
        const n = words(beat.text);
        if (n < BEAT_HARD_MIN_WORDS || n > BEAT_HARD_MAX_WORDS) {
          problems.push(`beat ${i + 1} is ${n} words, need 5-10`);
        }
        if (!(beat.seconds > 0)) problems.push(`beat ${i + 1} has no duration`);
        if (!beat.visual_query?.trim()) problems.push(`beat ${i + 1} has no visual_query`);
      });
      const total = p.beats.reduce((sum, b) => sum + (b.seconds || 0), 0);
      if (total < REEL_MIN_SECONDS || total > REEL_MAX_SECONDS) {
        problems.push(
          `total length ${total.toFixed(1)}s, need ${REEL_MIN_SECONDS}-${REEL_MAX_SECONDS}s`,
        );
      }
    }
    if (!p.cta?.trim()) problems.push('cta is empty');
    else if (words(p.cta) > 10) problems.push('cta is longer than 10 words');
    if (!p.caption?.trim()) problems.push('caption is empty');
    if (!p.hashtags?.length) problems.push('hashtags are empty');
  } else if (format.igFormat === 'CAROUSEL') {
    const p = payload as CarouselPayload;
    if (!Array.isArray(p.slides) || p.slides.length < 2) {
      problems.push('carousel needs at least 2 slides');
    } else {
      p.slides.forEach((slide, i) => {
        if (!slide.headline?.trim()) problems.push(`slide ${i + 1} has no headline`);
        else if (words(slide.headline) > 8) {
          problems.push(`slide ${i + 1} headline is longer than 8 words`);
        }
        if (words(slide.body ?? '') > 25) {
          problems.push(`slide ${i + 1} body is longer than 25 words`);
        }
      });
    }
    if (!p.caption?.trim()) problems.push('caption is empty');
    if (!p.hashtags?.length) problems.push('hashtags are empty');
  } else if (format.igFormat === 'IMAGE') {
    const p = payload as ImagePayload;
    if (!Array.isArray(p.text_lines) || !p.text_lines.some((l) => l.trim())) {
      problems.push('image has no text lines');
    } else {
      const limit = format.layout === 'columns' ? 20 : 10;
      p.text_lines.forEach((line, i) => {
        if (words(line) > limit) {
          problems.push(`line ${i + 1} is longer than ${limit} words`);
        }
        if (format.layout === 'columns' && !line.includes('||')) {
          problems.push(`line ${i + 1} must use 'left || right'`);
        }
      });
      if (format.lineCount && p.text_lines.length !== format.lineCount) {
        problems.push(
          `needs exactly ${format.lineCount} lines, got ${p.text_lines.length}`,
        );
      }
    }
    if (!p.caption?.trim()) problems.push('caption is empty');
    if (!p.hashtags?.length) problems.push('hashtags are empty');
  } else {
    const p = payload as StoryPayload;
    if (!Array.isArray(p.frames) || p.frames.length < 1) {
      problems.push('story has no frames');
    } else {
      p.frames.forEach((frame, i) => {
        if (!frame.text?.trim()) problems.push(`frame ${i + 1} has no text`);
        else if (words(frame.text) > 15) {
          problems.push(`frame ${i + 1} is longer than 15 words`);
        }
      });
    }
  }

  const haystack = collectText(format.igFormat, payload).join('\n').toLowerCase();
  for (const banned of bannedWords) {
    if (new RegExp(`\\b${escapeRegExp(banned)}\\b`).test(haystack)) {
      problems.push(`uses banned word "${banned}"`);
    }
  }

  return problems;
}

const NUMBER_RE = /\d[\d,.]*%?/g;

function normalise(text: string): string {
  return text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
}

/**
 * FR-3.5: numbers and quotes must come from the profile. Small plain counts
 * (list sizes, "3 steps") are allowed; anything that looks like a statistic
 * must appear in the profile JSON.
 */
export function findInventedFacts(
  format: FormatEntry,
  payload: GeneratedPayload,
  profileJson: string,
): string[] {
  const problems: string[] = [];
  const profileText = normalise(profileJson);
  const text = collectText(format.igFormat, payload).filter(Boolean);
  const hashtagless = text.filter((t) => !t.startsWith('#'));

  for (const line of hashtagless) {
    for (const raw of line.match(NUMBER_RE) ?? []) {
      const token = raw.replace(/[,.]+$/, '');
      const plain = /^\d{1,2}$/.test(token);
      if (plain) continue;
      if (!profileText.includes(normalise(token))) {
        problems.push(`number "${token}" is not in the profile`);
      }
    }
  }

  if (
    format.requiredInputs.some((i) =>
      ['proof.reviews', 'proof.comments', 'proof.news'].includes(i),
    )
  ) {
    for (const line of hashtagless) {
      const quoted = normalise(line).match(/"([^"]{12,})"/g) ?? [];
      for (const q of quoted) {
        const inner = q.slice(1, -1);
        if (!profileText.includes(inner)) {
          problems.push(`quote "${inner.slice(0, 40)}" is not in the profile`);
        }
      }
    }
  }

  return problems;
}
