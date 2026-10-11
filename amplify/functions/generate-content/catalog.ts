import catalogJson from './formats.json';
import overridesJson from './format-overrides.json';

export type IgFormat = 'REEL' | 'CAROUSEL' | 'IMAGE' | 'STORY';

export interface FormatEntry {
  id: number;
  name: string;
  group: string;
  igFormat: IgFormat;
  igFormatLabel: string;
  repostAs: string;
  isMeme: boolean;
  structure: string;
  hooks: string[];
  visual: string;
  cta: string;
  shareTrigger: string;
  promptTemplate: string;
  extraRules: string;
  requiredInputs: string[];
  layout?: Layout;
  lineCount?: number;
  sharpen?: string;
}

export type Layout = 'card' | 'grid' | 'columns' | 'stack';

interface FormatOverride {
  layout?: Layout;
  lineCount?: number;
  sharpen?: string;
}

export const PILLARS = ['PAIN', 'HOW_TO', 'RESULT', 'MYTH', 'IDENTITY'] as const;
export type Pillar = (typeof PILLARS)[number];

const PILLAR_LABELS: Record<Pillar, string> = {
  PAIN: 'Pain',
  HOW_TO: 'How-to',
  RESULT: 'Result',
  MYTH: 'Myth',
  IDENTITY: 'Identity',
};

export function pillarLabel(pillar: Pillar): string {
  return PILLAR_LABELS[pillar];
}

const catalog = catalogJson as { systemPrompt: string; formats: FormatEntry[] };

export const SYSTEM_PROMPT: string = catalog.systemPrompt;
const overrides = overridesJson as Record<string, FormatOverride>;

export const FORMATS: FormatEntry[] = catalog.formats.map((format) => ({
  ...format,
  ...(overrides[String(format.id)] ?? {}),
}));

export const TEXT_STYLE_KEYS = [
  'clean',
  'impact',
  'editorial',
  'highlight',
  'caption',
  'typewriter',
  'poster',
  'whisper',
] as const;

export function getFormat(id: number): FormatEntry | undefined {
  return FORMATS.find((format) => format.id === id);
}

export interface ProfileJson {
  personas: Array<{ id: string; name: string } & Record<string, string>>;
  features: Array<{ id: string; name: string } & Record<string, string>>;
  voice: Record<string, string>;
  proof: Record<string, unknown[]>;
  competitors: unknown[];
  brand: Record<string, string>;
  storeUrl: string;
  ctaText: string;
}

function hasItems(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

/** True when the profile holds every real input the format requires. */
export function inputsSatisfied(
  format: FormatEntry,
  profile: ProfileJson,
): boolean {
  return format.requiredInputs.every((input) => {
    if (input === 'competitors') return hasItems(profile.competitors);
    if (input === 'features.screenshot') {
      return profile.features.some((f) => (f.screenshot ?? '').trim());
    }
    if (input.startsWith('proof.')) {
      return hasItems(profile.proof?.[input.slice('proof.'.length)]);
    }
    return true;
  });
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Random pick that avoids recently used values while alternatives exist. */
export function pickAvoiding<T>(items: readonly T[], recent: readonly T[]): T {
  const fresh = items.filter((item) => !recent.includes(item));
  return pickRandom(fresh.length ? fresh : items);
}
