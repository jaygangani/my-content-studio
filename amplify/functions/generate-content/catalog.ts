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
  slideRange?: [number, number];
  variant?: CarouselLayout;
  stockPolicy?: 'never' | 'allowed' | 'preferred';
  /** Meme reel: a stock green screen video with AI text on top. */
  meme?: boolean;
  /** Viral clip reel: tweet-style text above a stock viral video. */
  viral?: boolean;
  /** Pipeline selector. `standard` formats are plain text formats. */
  kind?: 'standard' | 'meme' | 'viral';
  /** Content type key: reel | carousel | image | story. */
  contentType?: string;
  /** Reel subtype key such as `reel.green-screen`. */
  subtype?: string;
  /** Stock library category the format draws assets from. */
  assetCategory?: string;
  /** Optional pin to specific stock assets. */
  assetIds?: string[];
  enabled?: boolean;
  sortOrder?: number;
}

export type CarouselLayout =
  | 'steps'
  | 'checklist'
  | 'split'
  | 'stat'
  | 'quote'
  | 'tier'
  | 'cards'
  | 'chat'
  | 'level'
  | 'timeline'
  | 'grid'
  | 'flags'
  | 'editorial'
  | 'template'
  | 'poster';

export type Layout = 'card' | 'grid' | 'columns' | 'stack';

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

export const TEXT_STYLE_KEYS = [
  'clean',
  'meme',
  'sticker',
  'pop',
  'marker',
  'editorial',
  'caption',
  'poster',
] as const;

export interface ProfileJson {
  personas: Array<{ id: string; name: string } & Record<string, string>>;
  features: Array<{ id: string; name: string } & Record<string, string>>;
  voice: Record<string, string>;
  proof: Record<string, unknown[]>;
  competitors: unknown[];
  brand: Record<string, unknown>;
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

const HEX = /^#[0-9a-f]{6}$/i;

export interface BrandKit {
  primary: string;
  secondary: string;
  accent: string;
  headlineFont: string;
  bodyFont: string;
  visualStyle: string;
  logoCorner: string;
}

/** Complete brand kit or null when anything required is missing. */
export function readBrandKit(
  brand: Record<string, unknown> | undefined,
  _appLogo?: string | null,
): BrandKit | null {
  if (!brand) return null;
  const colors = (brand.colors ?? {}) as Record<string, unknown>;
  const text = (value: unknown): string =>
    typeof value === 'string' ? value.trim() : '';
  const primary = text(colors.primary);
  const secondary = text(colors.secondary);
  const accent = text(colors.accent);
  const headlineFont = text(brand.headlineFont);
  const bodyFont = text(brand.bodyFont);
  if (
    !HEX.test(primary) ||
    !HEX.test(secondary) ||
    !HEX.test(accent) ||
    !headlineFont ||
    !bodyFont
  ) {
    return null;
  }
  return {
    primary,
    secondary,
    accent,
    headlineFont,
    bodyFont,
    visualStyle: text(brand.visualStyle) || 'bold-minimal',
    logoCorner: text(brand.logoCorner) || 'top-left',
  };
}

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Random pick that avoids recently used values while alternatives exist. */
export function pickAvoiding<T>(items: readonly T[], recent: readonly T[]): T {
  const fresh = items.filter((item) => !recent.includes(item));
  return pickRandom(fresh.length ? fresh : items);
}
