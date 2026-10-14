import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {
  PILLARS,
  TEXT_STYLE_KEYS,
  inputsSatisfied,
  pickAvoiding,
  readBrandKit,
  pickRandom,
  pillarLabel,
} from './catalog';
import type {
  BrandKit,
  FormatEntry,
  IgFormat,
  Pillar,
  ProfileJson,
} from './catalog';
import { HttpError } from './errors';
import { callOpenAi, estimateCost, loadOpenAiKey } from './openai';
import { clearStoreCache, loadFormats, loadPrompts } from './store';
import type { Prompts } from './store';
import {
  FORMAT_DRAFT_SCHEMA,
  MEME_SCHEMA,
  SCHEMAS,
  VIRAL_SCHEMA,
} from './schemas';
import type { FormatDraft } from './schemas';
import type {
  CarouselPayload,
  GeneratedPayload,
  ImagePayload,
  MemeLinesPayload,
  ViralLinesPayload,
  ReelPayload,
} from './schemas';
import { findAsset, searchImages, searchVideos } from './stock';
import type { StockAsset } from './stock';
import {
  findBannedWords,
  findInventedFacts,
  findInventedNumbers,
  parseBannedWords,
  validatePayload,
} from './validate';
import type { CarouselContext } from './validate';

const DAILY_LIMIT = 5;
const MAX_SKIP_REDRAWS = 3;
const RECENT_WINDOW = 3;

type DataClient = ReturnType<typeof generateClient<Schema>>;
type ContentRow = Schema['Content']['type'];
type ContentTypeValue = NonNullable<ContentRow['type']>;

type ApiEvent = {
  rawPath?: string;
  body?: string | null;
  isBase64Encoded?: boolean;
  requestContext?: {
    authorizer?: { jwt?: { claims?: Record<string, unknown> } };
  };
};

type ApiResult = {
  statusCode: number;
  headers?: Record<string, string>;
  body: string;
};

function log(step: string, data: Record<string, unknown> = {}): void {
  console.log(JSON.stringify({ scope: 'generate-content', step, ...data }));
}

type GqlErrors = ReadonlyArray<{ message?: string }> | undefined;

function logGqlErrors(step: string, errors: GqlErrors): string | null {
  if (!errors?.length) return null;
  const message = errors
    .slice(0, 3)
    .map((e) => e.message ?? 'GraphQL error')
    .join('; ');
  console.error(JSON.stringify({ scope: 'generate-content', step, gqlErrors: message }));
  return message;
}

interface MemeVideo {
  id: string;
  title: string;
  keywords: string[];
  videoKey: string;
  keyColor: string;
}

interface MemeConfig {
  backgroundMode: 'stock' | 'solid' | 'brand';
  backgroundColor: string;
  loopSeconds: number;
  blockedVideoIds: string[];
  position: 'fill' | 'center' | 'bottom';
  scale: number;
  volume: number;
}

const MEME_LOOP_MIN = 5;
const MEME_LOOP_MAX = 30;
const MEME_FALLBACK_COLOR = '#0a0a0a';

function readMemeConfig(value: unknown): MemeConfig {
  const raw = parseJsonField<Record<string, unknown>>(value, {});
  const bg = (raw.background ?? {}) as Record<string, unknown>;
  const clip = (raw.clip ?? {}) as Record<string, unknown>;
  const mode = bg.mode === 'solid' || bg.mode === 'brand' ? bg.mode : 'stock';
  const color =
    typeof bg.color === 'string' && /^#[0-9a-f]{6}$/i.test(bg.color)
      ? bg.color
      : MEME_FALLBACK_COLOR;
  const loop = Number(raw.loopSeconds);
  const position =
    clip.position === 'center' || clip.position === 'bottom'
      ? clip.position
      : 'fill';
  const scale = Number(clip.scale);
  const volume = Number(clip.volume);
  return {
    backgroundMode: mode,
    backgroundColor: color,
    loopSeconds: Number.isFinite(loop)
      ? Math.min(MEME_LOOP_MAX, Math.max(MEME_LOOP_MIN, Math.round(loop)))
      : 10,
    blockedVideoIds: Array.isArray(raw.blockedVideoIds)
      ? raw.blockedVideoIds.filter((id): id is string => typeof id === 'string')
      : [],
    position,
    scale: Number.isFinite(scale) ? Math.min(1.5, Math.max(0.3, scale)) : 1,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1,
  };
}

interface MemeContext {
  video: MemeVideo;
  config: MemeConfig;
  backgroundColor: string;
}

interface ViralVideo {
  id: string;
  title: string;
  keywords: string[];
  videoKey: string;
  durationSeconds: number;
}

interface ViralConfig {
  blockedVideoIds: string[];
  volume: number;
}

const VIRAL_MAX_SECONDS = 30;

function readViralConfig(value: unknown): ViralConfig {
  const raw = parseJsonField<Record<string, unknown>>(value, {});
  const volume = Number(raw.volume);
  return {
    blockedVideoIds: Array.isArray(raw.blockedVideoIds)
      ? raw.blockedVideoIds.filter((id): id is string => typeof id === 'string')
      : [],
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1,
  };
}

interface Selection {
  format: FormatEntry;
  personaId: string;
  featureId: string;
  pillar: Pillar;
  video?: MemeVideo;
  viralVideo?: ViralVideo;
}

interface Attempt {
  selection: Selection;
  payload: GeneratedPayload;
  promptTokens: number;
  completionTokens: number;
}

let FORMATS: FormatEntry[] = [];
let PROMPTS: Prompts | null = null;

function prompts(): Prompts {
  if (!PROMPTS) throw new HttpError(503, 'Prompts are not loaded.');
  return PROMPTS;
}

function getFormat(id: number): FormatEntry | undefined {
  return FORMATS.find((format) => format.id === id);
}

async function prepare(client: DataClient): Promise<void> {
  FORMATS = await loadFormats(client);
  PROMPTS = await loadPrompts(client);
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const errors = (error as { errors?: Array<{ message?: string }> }).errors;
    if (Array.isArray(errors) && errors.length) {
      return errors
        .map((e) => e.message ?? 'GraphQL error')
        .slice(0, 3)
        .join('; ');
    }
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
    try {
      return JSON.stringify(error).slice(0, 300);
    } catch {
      return 'Unserialisable error object.';
    }
  }
  return 'Unknown error.';
}

function carouselRules(
  kit: BrandKit,
  screenshots: Array<{ id: string; name: string }>,
  stockPolicy: 'never' | 'allowed' | 'preferred',
  variant?: string,
): string {
  const p = prompts();
  const screenshotRule = screenshots.length
    ? p.fill(p.get('carousel.screenshot.available'), {
        ids: screenshots.map((s) => `${s.id} = ${s.name}`).join('; '),
      })
    : p.get('carousel.screenshot.unavailable');
  const styleRule =
    p.optional(`style.${kit.visualStyle}`) || p.optional('style.bold-minimal');
  const layoutRule = variant ? p.optional(`layout.${variant}`) : '';
  return p.fill(p.get('carousel.base'), {
    screenshot_rule: screenshotRule,
    stock_rule: p.get(`carousel.stock.${stockPolicy}`),
    style_rule: styleRule,
    layout_rule_line: layoutRule ? `- ${layoutRule}` : '',
    layout_note:
      variant && variant !== 'stat' ? p.optional('carousel.layout_note') : '',
  });
}

function imageRules(
  kit: BrandKit,
  stockPolicy: 'never' | 'allowed' | 'preferred',
): string {
  const p = prompts();
  const styleRule =
    p.optional(`style.${kit.visualStyle}`) || p.optional('style.bold-minimal');
  return p.fill(p.get('image.base'), {
    style_rule: styleRule,
    stock_rule: p.get(`image.stock.${stockPolicy}`),
  });
}

function jsonResponse(statusCode: number, payload: unknown): ApiResult {
  return {
    statusCode,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  };
}

function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  try {
    const parsed: unknown =
      typeof value === 'string' ? JSON.parse(value) : value;
    return (parsed ?? fallback) as T;
  } catch {
    return fallback;
  }
}

function parseProfile(row: Schema['AppProfile']['type'] | undefined): ProfileJson {
  const list = (value: unknown) => parseJsonField<unknown[]>(value, []);
  return {
    personas: list(row?.personas) as ProfileJson['personas'],
    features: list(row?.features) as ProfileJson['features'],
    voice: parseJsonField<Record<string, string>>(row?.voice, {}),
    proof: parseJsonField<Record<string, unknown[]>>(row?.proof, {}),
    competitors: list(row?.competitors),
    brand: parseJsonField<Record<string, string>>(row?.brand, {}),
    storeUrl: row?.storeUrl ?? '',
    ctaText: row?.ctaText ?? '',
  };
}

function missingProfileFields(
  description: string | null | undefined,
  profile: ProfileJson,
): string[] {
  const missing: string[] = [];
  if (!description?.trim()) missing.push('app description');
  if (!profile.personas.some((p) => p.name?.trim())) missing.push('persona');
  if (!profile.features.some((f) => f.name?.trim())) missing.push('feature');
  if (!profile.voice.tone?.trim()) missing.push('voice tone');
  if (!profile.ctaText.trim()) missing.push('CTA wording');
  return missing;
}

function readBody(event: ApiEvent): Record<string, unknown> {
  const raw =
    event.body == null
      ? ''
      : event.isBase64Encoded
        ? Buffer.from(event.body, 'base64').toString('utf8')
        : event.body;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, 'Invalid JSON body.');
  }
}

function callerOwner(event: ApiEvent): string {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
  const sub = typeof claims.sub === 'string' ? claims.sub : null;
  const username =
    typeof claims.username === 'string'
      ? claims.username
      : typeof claims['cognito:username'] === 'string'
        ? (claims['cognito:username'] as string)
        : null;
  if (!sub || !username) throw new HttpError(401, 'Unauthenticated.');
  return username;
}

const ADMIN_GROUP = 'admin';

function callerGroups(event: ApiEvent): string[] {
  const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
  const raw = claims['cognito:groups'];
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string');
  }
  if (typeof raw !== 'string') return [];
  return raw
    .replace(/^\[|\]$/g, '')
    .split(/[\s,]+/)
    .map((item) => item.replace(/^"|"$/g, '').trim())
    .filter(Boolean);
}

function isAdmin(event: ApiEvent): boolean {
  return callerGroups(event).includes(ADMIN_GROUP);
}

function ownerMatches(stored: string, username: string): boolean {
  return stored === username || stored.split('::')[1] === username;
}

const IG_FORMATS: IgFormat[] = ['REEL', 'CAROUSEL', 'IMAGE', 'STORY'];

function readIgFormat(value: unknown): IgFormat | undefined {
  if (typeof value !== 'string') return undefined;
  return IG_FORMATS.find((format) => format === value);
}

function requireString(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  if (typeof value !== 'string' || !value.trim()) {
    throw new HttpError(400, `${key} is required.`);
  }
  return value.trim();
}

function requireLocalDate(body: Record<string, unknown>): string {
  const value = body.localDate;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'localDate (YYYY-MM-DD) is required.');
  }
  return value;
}

function fillTemplate(
  format: FormatEntry,
  profileJson: string,
  selection: Selection,
  persona: unknown,
  feature: unknown,
  appName: string,
): string {
  const rules = [
    format.sharpen ? `Sharpening rules for this format:\n${format.sharpen}` : null,
    format.lineCount
      ? `Return exactly ${format.lineCount} entries in the main text array.`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join('\n\n');
  const template = rules
    ? `${format.promptTemplate}\n\n${rules}`
    : format.promptTemplate;
  return template
    .replaceAll('{{app_name}}', appName)
    .replaceAll('{{persona}}', JSON.stringify(persona))
    .replaceAll('{{pillar}}', pillarLabel(selection.pillar))
    .replaceAll('{{feature}}', JSON.stringify(feature))
    .replaceAll('{{app_profile_json}}', profileJson);
}

async function recentPicks(client: DataClient, appId: string) {
  const { data } = await client.models.Content.list({
    filter: { appId: { eq: appId } },
  });
  const latest = [...data]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, RECENT_WINDOW);
  return {
    personas: latest.map((c) => c.personaId).filter((v): v is string => !!v),
    features: latest.map((c) => c.featureId).filter((v): v is string => !!v),
    pillars: latest.map((c) => c.pillar).filter((v): v is Pillar => !!v),
    videos: latest
      .map((c) => {
        const script = parseJsonField<{
          payload?: {
            meme?: { videoId?: string };
            viral?: { videoId?: string };
          };
        }>(c.scriptJson, {});
        return (
          script.payload?.meme?.videoId ?? script.payload?.viral?.videoId
        );
      })
      .filter((v): v is string => typeof v === 'string'),
  };
}

interface CompactSpec {
  /** Snippet keys tried in order for the default system prompt. */
  systemKeys: string[];
  schema: Record<string, unknown>;
  /** Line length shown to the model; validation allows 2 more words. */
  lineLimit: number;
  clip: { title: string; keywords: string[] };
  needsBackgroundQuery?: boolean;
}

/** Default snippet plus the format's own instructions, hooks and rules. */
function compactSystem(format: FormatEntry, keys: string[]): string {
  const base = prompts().first(...keys);
  const extra = [
    format.promptTemplate
      .split('\n')
      .filter((line) => !line.includes('{{'))
      .join('\n')
      .trim(),
    format.extraRules.trim(),
    format.sharpen?.trim() ?? '',
    format.hooks.length
      ? `Hook patterns (adapt, do not copy):\n- ${format.hooks.join('\n- ')}`
      : '',
  ].filter(Boolean);
  return extra.length
    ? `${base}\n\nFormat-specific instructions:\n${extra.join('\n\n')}`
    : base;
}

/**
 * One compact generation: small profile slice + clip title and keywords in,
 * three line variants + caption + hashtags out. Shared by every subtype that
 * writes text for a stock clip.
 */
async function generateCompactAttempt(
  spec: CompactSpec,
  apiKey: string,
  model: string,
  appName: string,
  description: string,
  profile: ProfileJson,
  profileJson: string,
  selection: Selection,
  bannedWords: string[],
): Promise<
  | { kind: 'skip'; reason: string; tokens: number; completion: number }
  | { kind: 'ok'; attempt: Attempt }
> {
  const persona = profile.personas.find((p) => p.id === selection.personaId);
  const feature = profile.features.find((f) => f.id === selection.featureId);
  const systemPrompt = compactSystem(selection.format, spec.systemKeys);
  const userPrompt = JSON.stringify({
    app: appName,
    about: description,
    persona: persona && {
      name: persona.name,
      pain: persona.pain,
      desiredResult: persona.desiredResult,
      words: persona.words,
      dailyMoments: persona.dailyMoments,
    },
    feature: feature && { name: feature.name, benefit: feature.benefit },
    pillar: pillarLabel(selection.pillar),
    voice: profile.voice,
    cta: profile.ctaText,
    clip: spec.clip,
    ...(spec.needsBackgroundQuery !== undefined
      ? { backgroundNeeded: spec.needsBackgroundQuery }
      : {}),
  });

  let tokens = 0;
  let completion = 0;
  let problems: string[] = [];

  for (let round = 0; round < 2; round += 1) {
    const prompt = problems.length
      ? `${userPrompt}\n\nFix these problems:\n- ${problems.join('\n- ')}`
      : userPrompt;
    log('openai.request', {
      formatId: selection.format.id,
      subtype: selection.format.subtype,
      round,
      model,
      promptChars: prompt.length,
    });
    const result = await callOpenAi(
      apiKey,
      model,
      systemPrompt,
      prompt,
      spec.schema,
    );
    tokens += result.promptTokens;
    completion += result.completionTokens;
    const payload = result.payload as MemeLinesPayload | ViralLinesPayload;

    const skip = payload.skip?.trim();
    if (skip) return { kind: 'skip', reason: skip, tokens, completion };

    const lines = (payload.lines ?? []).map((l) => l.trim()).filter(Boolean);
    problems = [];
    if (lines.length < 3) problems.push('need 3 non-empty lines');
    lines.forEach((line, i) => {
      if (words(line) > spec.lineLimit + 2) {
        problems.push(`line ${i + 1} is over ${spec.lineLimit} words`);
      }
    });
    if (!payload.caption?.trim()) problems.push('caption is empty');
    if (!payload.hashtags?.length) problems.push('hashtags are empty');
    const texts = [...lines, payload.caption ?? '', ...(payload.hashtags ?? [])];
    problems.push(
      ...findBannedWords(texts, bannedWords),
      ...findInventedNumbers(
        texts.filter((t) => !t.startsWith('#')),
        profileJson,
      ),
    );
    log('validation', {
      formatId: selection.format.id,
      round,
      ok: problems.length === 0,
      problems: problems.slice(0, 6),
    });
    if (!problems.length) {
      return {
        kind: 'ok',
        attempt: {
          selection,
          payload: { ...payload, lines },
          promptTokens: tokens,
          completionTokens: completion,
        },
      };
    }
  }

  throw new HttpError(
    422,
    `Draft failed validation after a retry: ${problems.slice(0, 3).join('; ')}`,
  );
}

async function generateViralAttempt(
  apiKey: string,
  model: string,
  appName: string,
  description: string,
  profile: ProfileJson,
  profileJson: string,
  selection: Selection,
  bannedWords: string[],
) {
  const video = selection.viralVideo;
  if (!video) throw new HttpError(422, 'No viral video selected.');
  return generateCompactAttempt(
    {
      systemKeys: ['reel.tweet-style.system', 'viral.system'],
      schema: VIRAL_SCHEMA,
      lineLimit: 18,
      clip: { title: video.title, keywords: video.keywords },
    },
    apiKey,
    model,
    appName,
    description,
    profile,
    profileJson,
    selection,
    bannedWords,
  );
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function generateMemeAttempt(
  apiKey: string,
  model: string,
  appName: string,
  description: string,
  profile: ProfileJson,
  profileJson: string,
  selection: Selection,
  bannedWords: string[],
  needsBackgroundQuery: boolean,
) {
  const video = selection.video;
  if (!video) throw new HttpError(422, 'No green screen video selected.');
  return generateCompactAttempt(
    {
      systemKeys: ['reel.green-screen.system', 'meme.system'],
      schema: MEME_SCHEMA,
      lineLimit: 12,
      clip: { title: video.title, keywords: video.keywords },
      needsBackgroundQuery,
    },
    apiKey,
    model,
    appName,
    description,
    profile,
    profileJson,
    selection,
    bannedWords,
  );
}

async function generateAttempt(
  apiKey: string,
  model: string,
  appName: string,
  profile: ProfileJson,
  profileJson: string,
  selection: Selection,
  bannedWords: string[],
  extraRules: string,
  carouselContext: CarouselContext,
): Promise<
  | { kind: 'skip'; reason: string; tokens: number; completion: number }
  | { kind: 'ok'; attempt: Attempt }
> {
  const persona = profile.personas.find((p) => p.id === selection.personaId);
  const feature = profile.features.find((f) => f.id === selection.featureId);
  const userPrompt = fillTemplate(
    selection.format,
    profileJson,
    selection,
    persona,
    feature,
    appName,
  );
  const systemPrompt = [
    prompts().get('system'),
    prompts().get('addendum'),
    extraRules,
  ]
    .filter(Boolean)
    .join('\n\n');
  const schema = SCHEMAS[selection.format.igFormat];

  let tokens = 0;
  let completion = 0;
  let problems: string[] = [];

  for (let round = 0; round < 2; round += 1) {
    const prompt = problems.length
      ? `${userPrompt}\n\nYour previous answer failed these checks. Fix them:\n- ${problems.join('\n- ')}`
      : userPrompt;
    const started = Date.now();
    log('openai.request', {
      formatId: selection.format.id,
      round,
      model,
      promptChars: prompt.length,
    });
    const result = await callOpenAi(apiKey, model, systemPrompt, prompt, schema);
    tokens += result.promptTokens;
    completion += result.completionTokens;
    log('openai.response', {
      formatId: selection.format.id,
      round,
      ms: Date.now() - started,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
    });

    const skip = (result.payload as { skip?: string }).skip?.trim();
    if (skip) {
      log('openai.skip', { formatId: selection.format.id, reason: skip });
      return { kind: 'skip', reason: skip, tokens, completion };
    }

    problems = [
      ...validatePayload(
        selection.format,
        result.payload,
        bannedWords,
        carouselContext,
      ),
      ...findInventedFacts(selection.format, result.payload, profileJson),
    ];
    log('validation', {
      formatId: selection.format.id,
      round,
      ok: problems.length === 0,
      problems: problems.slice(0, 6),
    });
    if (!problems.length) {
      return {
        kind: 'ok',
        attempt: {
          selection,
          payload: result.payload,
          promptTokens: tokens,
          completionTokens: completion,
        },
      };
    }
  }

  throw new HttpError(
    422,
    `Draft failed validation after a retry: ${problems.slice(0, 3).join('; ')}`,
  );
}

async function fetchAssets(
  format: FormatEntry,
  payload: GeneratedPayload,
  meme?: MemeContext,
): Promise<Array<StockAsset & { beatIndex: number }>> {
  const out: Array<StockAsset & { beatIndex: number }> = [];

  if (format.viral) return out;

  if (format.meme) {
    const query = (payload as MemeLinesPayload).bg_query?.trim();
    if (meme?.config.backgroundMode === 'stock' && query) {
      const asset = await findAsset(query, 'IMAGE').catch(() => null);
      log('stock.image', { query, found: asset !== null });
      if (asset) out.push({ ...asset, beatIndex: 0 });
    }
  } else if (format.igFormat === 'REEL') {
    const reel = payload as ReelPayload;
    for (const [index, beat] of reel.beats.entries()) {
      const asset = await findAsset(beat.visual_query, 'VIDEO', beat.seconds);
      log('stock.video', {
        beat: index,
        query: beat.visual_query,
        found: asset !== null,
      });
      if (!asset) {
        throw new HttpError(
          502,
          `No stock video found for "${beat.visual_query}".`,
        );
      }
      out.push({ ...asset, beatIndex: index });
    }
  } else if (format.igFormat === 'CAROUSEL') {
    const carousel = payload as CarouselPayload;
    for (const [index, slide] of carousel.slides.entries()) {
      if (slide.visual_type !== 'stock' || !slide.visual.trim()) continue;
      const asset = await findAsset(slide.visual, 'IMAGE');
      log('stock.image', {
        slide: index,
        query: slide.visual,
        found: asset !== null,
      });
      if (asset) out.push({ ...asset, beatIndex: index });
    }
  } else if (format.igFormat === 'IMAGE') {
    const image = payload as ImagePayload;
    if ((format.stockPolicy ?? 'never') !== 'never' && image.visual.trim()) {
      const asset = await findAsset(image.visual, 'IMAGE');
      if (asset) out.push({ ...asset, beatIndex: 0 });
    }
  }

  return out;
}

function contentType(format: FormatEntry): ContentTypeValue {
  if (format.meme) return 'MEME';
  switch (format.igFormat) {
    case 'REEL':
      return 'SHORT_FORM_VIDEO';
    case 'CAROUSEL':
      return 'CAROUSEL';
    case 'IMAGE':
      return format.isMeme ? 'MEME' : 'SINGLE_IMAGE';
    case 'STORY':
      return 'TEXT_POST';
  }
}

interface PieceFields {
  title: string;
  caption: string | null;
  hashtags: string[];
  scriptJson: string;
  overlayText: string | null;
  videoKeywords: string[];
  videoConfigurations: string | null;
}

function unifyReel(payload: ReelPayload): void {
  if (!payload.beats.length) return;
  const lastIndex = payload.beats.length - 1;
  if (payload.hook.trim()) payload.beats[0].text = payload.hook.trim();
  if (lastIndex > 0 && payload.cta.trim()) {
    payload.beats[lastIndex].text = payload.cta.trim();
  }
  payload.hook = payload.beats[0].text;
  payload.cta = payload.beats[lastIndex].text;
  (payload as ReelPayload & { unified?: boolean }).unified = true;
}

function toMemeFields(
  format: FormatEntry,
  payload: MemeLinesPayload,
  meme: MemeContext,
  hasBackgroundPhoto: boolean,
): PieceFields {
  const first = payload.lines[0] ?? '';
  const mode = meme.config.backgroundMode;
  const script = JSON.stringify({
    schema: 'REEL',
    subtype: 'reel.green-screen',
    formatId: format.id,
    formatName: format.name,
    textStyle: 'meme',
    payload: {
      hook: first,
      beats: [
        { text: first, seconds: meme.config.loopSeconds, visual_query: '' },
      ],
      cta: '',
      caption: payload.caption,
      hashtags: payload.hashtags,
      audio_mood: '',
      total_seconds: meme.config.loopSeconds,
      unified: true,
      meme: {
        videoId: meme.video.id,
        videoKey: meme.video.videoKey,
        videoTitle: meme.video.title,
        keyColor: meme.video.keyColor,
        loopSeconds: meme.config.loopSeconds,
        lineOptions: payload.lines,
        texts: [{ text: first }],
        background: {
          mode: mode === 'stock' && !hasBackgroundPhoto ? 'solid' : mode,
          color: meme.backgroundColor,
        },
        clip: {
          position: meme.config.position,
          scale: meme.config.scale,
          volume: meme.config.volume,
        },
      },
    },
  });
  return {
    title: first,
    caption: payload.caption,
    hashtags: payload.hashtags,
    scriptJson: script,
    overlayText: null,
    videoKeywords: meme.video.keywords,
    videoConfigurations: null,
  };
}

function toViralFields(
  format: FormatEntry,
  payload: ViralLinesPayload,
  video: ViralVideo,
  config: ViralConfig,
): PieceFields {
  const first = payload.lines[0] ?? '';
  const seconds = Math.min(
    VIRAL_MAX_SECONDS,
    Math.max(1, Math.round(video.durationSeconds || 15)),
  );
  const script = JSON.stringify({
    schema: 'REEL',
    subtype: 'reel.tweet-style',
    formatId: format.id,
    formatName: format.name,
    textStyle: 'clean',
    payload: {
      hook: first,
      beats: [{ text: first, seconds, visual_query: '' }],
      cta: '',
      caption: payload.caption,
      hashtags: payload.hashtags,
      audio_mood: '',
      total_seconds: seconds,
      unified: true,
      viral: {
        videoId: video.id,
        videoKey: video.videoKey,
        videoTitle: video.title,
        durationSeconds: seconds,
        lineOptions: payload.lines,
        texts: [{ text: first }],
        clip: { volume: config.volume },
        header: { background: '#000000' },
      },
    },
  });
  return {
    title: first,
    caption: payload.caption,
    hashtags: payload.hashtags,
    scriptJson: script,
    overlayText: null,
    videoKeywords: video.keywords,
    videoConfigurations: null,
  };
}

function toPieceFields(
  format: FormatEntry,
  payload: GeneratedPayload,
  meme?: MemeContext,
  hasBackgroundPhoto = false,
  viral?: { video: ViralVideo; config: ViralConfig },
): PieceFields {
  if (format.viral && viral) {
    return toViralFields(
      format,
      payload as ViralLinesPayload,
      viral.video,
      viral.config,
    );
  }
  if (format.meme && meme) {
    return toMemeFields(
      format,
      payload as MemeLinesPayload,
      meme,
      hasBackgroundPhoto,
    );
  }
  if (format.igFormat === 'REEL') unifyReel(payload as ReelPayload);
  const script = JSON.stringify({
    schema: format.igFormat,
    subtype: format.igFormat === 'REEL' ? 'reel.video-beats' : undefined,
    formatId: format.id,
    formatName: format.name,
    textStyle: pickRandom(TEXT_STYLE_KEYS),
    layout: format.layout,
    variant: format.variant,
    stockPolicy:
      format.igFormat === 'CAROUSEL' || format.igFormat === 'IMAGE'
        ? format.stockPolicy
        : undefined,
    bgScheme:
      format.igFormat === 'CAROUSEL' || format.igFormat === 'IMAGE'
        ? pickRandom(['dark', 'light', 'tinted', 'bold'] as const)
        : undefined,
    hookCover:
      format.igFormat === 'CAROUSEL'
        ? pickRandom([
            'classic',
            'centered',
            'bigtype',
            'framed',
            'split',
            'badge',
            'stripe',
          ] as const)
        : undefined,
    payload,
  });

  if (format.igFormat === 'REEL') {
    const reel = payload as ReelPayload;
    let cursor = 0;
    const timeline = reel.beats.map((beat, index) => {
      const start = cursor;
      cursor += beat.seconds;
      return {
        segment_id: index + 1,
        text: beat.text,
        start_time_sec: start,
        end_time_sec: cursor,
        duration_sec: beat.seconds,
      };
    });
    return {
      title: reel.hook,
      caption: reel.caption,
      hashtags: reel.hashtags,
      scriptJson: script,
      overlayText: JSON.stringify({ overlay_text_timeline: timeline }),
      videoKeywords: reel.beats.map((b) => b.visual_query),
      videoConfigurations: JSON.stringify({
        duration: Math.min(20, Math.max(1, cursor)),
        search_keywords: reel.beats.map((b) => b.visual_query),
        orientation: 'portrait',
      }),
    };
  }

  if (format.igFormat === 'CAROUSEL') {
    const carousel = payload as CarouselPayload;
    return {
      title: carousel.slides[0]?.headline || format.name,
      caption: carousel.caption,
      hashtags: carousel.hashtags,
      scriptJson: script,
      overlayText: null,
      videoKeywords: [],
      videoConfigurations: null,
    };
  }

  if (format.igFormat === 'IMAGE') {
    const image = payload as ImagePayload;
    return {
      title: image.text_lines[0] || format.name,
      caption: image.caption,
      hashtags: image.hashtags,
      scriptJson: script,
      overlayText: null,
      videoKeywords: [],
      videoConfigurations: null,
    };
  }

  const story = payload as { frames: Array<{ text: string }>; caption_note: string };
  return {
    title: story.frames[0]?.text || format.name,
    caption: story.caption_note,
    hashtags: [],
    scriptJson: script,
    overlayText: null,
    videoKeywords: [],
    videoConfigurations: null,
  };
}

async function readUsage(
  client: DataClient,
  appId: string,
  date: string,
): Promise<number> {
  const { data, errors } = await client.models.DailyUsage.get({
    id: `${appId}#${date}`,
  });
  logGqlErrors('DailyUsage.get', errors);
  return data?.count ?? 0;
}

async function bumpUsage(
  client: DataClient,
  appId: string,
  date: string,
  owner: string,
  current: number,
): Promise<number> {
  const id = `${appId}#${date}`;
  const next = current + 1;
  if (current === 0) {
    const { errors } = await client.models.DailyUsage.create({
      id,
      appId,
      date,
      count: next,
      owner,
    });
    logGqlErrors('DailyUsage.create', errors);
    if (errors?.length) {
      const updated = await client.models.DailyUsage.update({ id, count: next });
      logGqlErrors('DailyUsage.update', updated.errors);
    }
  } else {
    const updated = await client.models.DailyUsage.update({ id, count: next });
    logGqlErrors('DailyUsage.update', updated.errors);
  }
  return next;
}

async function writeLog(
  client: DataClient,
  owner: string,
  entry: {
    appId: string;
    pieceId?: string;
    formatId?: number;
    model: string;
    tokens: number;
    completionTokens: number;
    startedAt: number;
    outcome: 'OK' | 'SKIPPED' | 'FAILED';
    error?: string;
  },
): Promise<void> {
  const created = await client.models.GenerationLog.create({
    appId: entry.appId,
    pieceId: entry.pieceId,
    formatId: entry.formatId,
    model: entry.model,
    tokens: entry.tokens + entry.completionTokens,
    cost: estimateCost(entry.model, entry.tokens, entry.completionTokens) ?? undefined,
    durationMs: Date.now() - entry.startedAt,
    outcome: entry.outcome,
    error: entry.error,
    owner,
  });
  logGqlErrors('GenerationLog.create', created.errors);
}

interface RunInput {
  client: DataClient;
  owner: string;
  appId: string;
  localDate: string;
  forced?: Selection;
  replacePieceId?: string;
  unlimited: boolean;
  igFormat?: IgFormat;
  reelKind?: 'meme' | 'viral';
}

interface StockRow {
  id: string;
  title: string;
  keywords: string[];
  assetKey: string;
  durationSeconds: number;
  keyColor: string;
}

/** Enabled stock assets of one category from the unified library. */
async function listStock(
  client: DataClient,
  category: string,
): Promise<StockRow[]> {
  const rows: StockRow[] = [];
  let nextToken: string | null | undefined;
  do {
    const page = await client.models.StockAsset.list({
      limit: 500,
      nextToken,
      filter: { category: { eq: category } },
    });
    logGqlErrors('StockAsset.list', page.errors);
    for (const row of page.data) {
      if (row.enabled === false || !row.assetKey) continue;
      rows.push({
        id: row.id,
        title: row.title,
        keywords: (row.keywords ?? []).filter((k): k is string => !!k),
        assetKey: row.assetKey,
        durationSeconds: row.durationSeconds ?? 0,
        keyColor: row.keyColor ?? '',
      });
    }
    nextToken = page.nextToken;
  } while (nextToken);
  return rows;
}

async function listMemeVideos(client: DataClient): Promise<MemeVideo[]> {
  const stock = (await listStock(client, 'green-screen')).filter(
    (row) => row.keyColor,
  );
  if (stock.length) {
    return stock.map((row) => ({
      id: row.id,
      title: row.title,
      keywords: row.keywords,
      videoKey: row.assetKey,
      keyColor: row.keyColor,
    }));
  }
  const { data, errors } = await client.models.GreenScreenVideo.list({
    limit: 1000,
  });
  logGqlErrors('GreenScreenVideo.list', errors);
  return data
    .filter((v) => v.videoKey && v.keyColor)
    .map((v) => ({
      id: v.id,
      title: v.title,
      keywords: (v.keywords ?? []).filter((k): k is string => !!k),
      videoKey: v.videoKey,
      keyColor: v.keyColor,
    }));
}

async function listViralVideos(client: DataClient): Promise<ViralVideo[]> {
  const stock = await listStock(client, 'viral-clip');
  if (stock.length) {
    return stock.map((row) => ({
      id: row.id,
      title: row.title,
      keywords: row.keywords,
      videoKey: row.assetKey,
      durationSeconds: row.durationSeconds,
    }));
  }
  const { data, errors } = await client.models.ViralVideo.list({ limit: 1000 });
  logGqlErrors('ViralVideo.list', errors);
  return data
    .filter((v) => v.videoKey)
    .map((v) => ({
      id: v.id,
      title: v.title,
      keywords: (v.keywords ?? []).filter((k): k is string => !!k),
      videoKey: v.videoKey,
      durationSeconds: v.durationSeconds ?? 0,
    }));
}

async function runGeneration(input: RunInput) {
  const { client, owner, appId, localDate } = input;

  log('run.start', {
    appId,
    localDate,
    regenerate: Boolean(input.replacePieceId),
    forced: Boolean(input.forced),
  });

  const { data: app, errors: appErrors } = await client.models.Apps.get({
    id: appId,
  });
  const appErrorMessage = logGqlErrors('Apps.get', appErrors);
  if (!app) {
    throw new HttpError(
      404,
      appErrorMessage
        ? `Could not load app: ${appErrorMessage}`
        : `App ${appId} not found.`,
    );
  }
  log('app.loaded', {
    hasOwner: Boolean(app.owner),
    ownerMatches: app.owner ? ownerMatches(app.owner, owner) : null,
    hasDescription: Boolean(app.description?.trim()),
  });
  if (!app.owner) {
    const adopted = await client.models.Apps.update({ id: appId, owner });
    if (adopted.errors?.length) {
      throw new HttpError(
        500,
        `Could not assign owner: ${adopted.errors[0].message}`,
      );
    }
  } else if (!ownerMatches(app.owner, owner)) {
    console.warn('App owner mismatch', {
      appId,
      storedShape: app.owner.includes('::') ? 'sub::username' : 'other',
    });
    throw new HttpError(403, 'Not your app.');
  }

  const profileRows = await client.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  });
  logGqlErrors('AppProfile.list', profileRows.errors);
  const profile = parseProfile(profileRows.data[0]);
  const missing = missingProfileFields(app.description, profile);
  log('profile.loaded', {
    found: profileRows.data.length > 0,
    personas: profile.personas.length,
    features: profile.features.length,
    missing,
  });
  if (missing.length) {
    throw new HttpError(
      422,
      `Complete the profile first. Missing: ${missing.join(', ')}.`,
    );
  }

  const used = await readUsage(client, appId, localDate);
  log('usage', {
    used,
    limit: input.unlimited ? 'unlimited' : DAILY_LIMIT,
  });
  if (!input.unlimited && used >= DAILY_LIMIT) {
    throw new HttpError(
      429,
      `Daily limit of ${DAILY_LIMIT} generations reached. It resets at midnight.`,
    );
  }

  const apiKey = await loadOpenAiKey();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  log('openai.key.loaded', { model, pexelsParamSet: Boolean(process.env.PEXELS_API_KEY_PARAM) });
  const profileJson = JSON.stringify(profile);
  const bannedWords = parseBannedWords(profile.voice);
  const recent = await recentPicks(client, appId);

  const brandKit = readBrandKit(profile.brand, app.logo);
  log('brand', { complete: brandKit !== null });
  if (
    (input.igFormat === 'CAROUSEL' || input.igFormat === 'IMAGE') &&
    !brandKit
  ) {
    throw new HttpError(
      422,
      'Add your brand kit (colours and fonts) in the Profile tab to generate carousels and images.',
    );
  }
  if (
    (input.forced?.format.igFormat === 'CAROUSEL' ||
      input.forced?.format.igFormat === 'IMAGE') &&
    !brandKit
  ) {
    throw new HttpError(
      422,
      'Add your brand kit (colours, fonts, logo) in the Profile tab to generate carousels and images.',
    );
  }

  const screenshotFeatures = profile.features
    .filter((f) => (f.screenshot ?? '').trim())
    .map((f) => ({ id: f.id, name: f.name }));

  const personas = profile.personas.filter((p) => p.name?.trim());
  const features = profile.features.filter((f) => f.name?.trim());

  const profileRow = profileRows.data[0];
  const reelConfigs = parseJsonField<Record<string, unknown>>(
    profileRow?.reelConfig,
    {},
  );
  const memeConfig = readMemeConfig(
    reelConfigs['reel.green-screen'] ?? profileRow?.memeConfig,
  );
  const wantMeme =
    input.reelKind === 'meme' ||
    Boolean(input.forced?.format.meme) ||
    !input.igFormat;
  const memeVideos = wantMeme
    ? (await listMemeVideos(client)).filter(
        (v) => !memeConfig.blockedVideoIds.includes(v.id),
      )
    : [];
  const brandColors = (profile.brand.colors ?? {}) as Record<string, unknown>;
  const brandPrimary =
    typeof brandColors.primary === 'string' &&
    /^#[0-9a-f]{6}$/i.test(brandColors.primary)
      ? brandColors.primary
      : MEME_FALLBACK_COLOR;
  const memeBackgroundColor =
    memeConfig.backgroundMode === 'brand'
      ? brandPrimary
      : memeConfig.backgroundColor;
  if (input.reelKind === 'meme' && !memeVideos.length) {
    throw new HttpError(
      422,
      'No green screen videos are available. Ask an admin to add some.',
    );
  }

  const viralConfig = readViralConfig(
    reelConfigs['reel.tweet-style'] ?? profileRow?.viralConfig,
  );
  const wantViral =
    input.reelKind === 'viral' ||
    Boolean(input.forced?.format.viral) ||
    !input.igFormat;
  const viralVideos = wantViral
    ? (await listViralVideos(client)).filter(
        (v) => !viralConfig.blockedVideoIds.includes(v.id),
      )
    : [];
  if (input.reelKind === 'viral' && !viralVideos.length) {
    throw new HttpError(
      422,
      'No viral videos are available. Ask an admin to add some.',
    );
  }

  let attempt: Attempt | null = null;
  const tried = new Set<number>();

  for (let draw = 0; draw <= MAX_SKIP_REDRAWS && !attempt; draw += 1) {
    let selection = input.forced;
    if (!selection || draw > 0) {
      const eligible = FORMATS.filter(
        (f) =>
          f.enabled !== false &&
          !tried.has(f.id) &&
          (!input.igFormat || f.igFormat === input.igFormat) &&
          (input.forced?.format.meme || input.reelKind === 'meme'
            ? Boolean(f.meme)
            : input.forced?.format.viral || input.reelKind === 'viral'
              ? Boolean(f.viral)
              : (!f.meme || (!input.igFormat && memeVideos.length > 0)) &&
                (!f.viral || (!input.igFormat && viralVideos.length > 0))) &&
          inputsSatisfied(f, profile) &&
          ((f.igFormat !== 'CAROUSEL' && f.igFormat !== 'IMAGE') ||
            brandKit !== null),
      );
      if (!eligible.length) {
        throw new HttpError(
          422,
          input.igFormat
            ? `No ${input.igFormat.toLowerCase()} format fits the current profile. Try another type.`
            : 'No format fits the current profile.',
        );
      }
      const pool = input.forced
        ? eligible.filter((f) => f.igFormat === input.forced?.format.igFormat)
        : eligible;
      const format = pickRandom(pool.length ? pool : eligible);
      selection = {
        format,
        personaId:
          input.forced?.personaId ??
          pickAvoiding(
            personas.map((p) => p.id),
            recent.personas,
          ),
        featureId:
          input.forced?.featureId ??
          pickAvoiding(
            features.map((f) => f.id),
            recent.features,
          ),
        pillar:
          input.forced?.pillar ?? pickAvoiding(PILLARS, recent.pillars),
      };
    }
    if (selection.format.meme && !selection.video) {
      if (!memeVideos.length) {
        throw new HttpError(
          422,
          'No green screen videos are available. Ask an admin to add some.',
        );
      }
      const pinned = selection.format.assetIds ?? [];
      const pool = pinned.length
        ? memeVideos.filter((v) => pinned.includes(v.id))
        : memeVideos;
      if (!pool.length) {
        throw new HttpError(
          422,
          'None of the pinned green screen videos are available for this app.',
        );
      }
      const ids = pool.map((v) => v.id);
      const chosen = pickAvoiding(ids, recent.videos);
      selection = {
        ...selection,
        video: memeVideos.find((v) => v.id === chosen),
      };
    }
    if (selection.format.viral && !selection.viralVideo) {
      if (!viralVideos.length) {
        throw new HttpError(
          422,
          'No viral videos are available. Ask an admin to add some.',
        );
      }
      const pinned = selection.format.assetIds ?? [];
      const pool = pinned.length
        ? viralVideos.filter((v) => pinned.includes(v.id))
        : viralVideos;
      if (!pool.length) {
        throw new HttpError(
          422,
          'None of the pinned viral clips are available for this app.',
        );
      }
      const ids = pool.map((v) => v.id);
      const chosen = pickAvoiding(ids, recent.videos);
      selection = {
        ...selection,
        viralVideo: viralVideos.find((v) => v.id === chosen),
      };
    }
    tried.add(selection.format.id);
    log('selection', {
      draw,
      formatId: selection.format.id,
      formatName: selection.format.name,
      igFormat: selection.format.igFormat,
      pillar: selection.pillar,
    });

    const startedAt = Date.now();
    try {
      const result = selection.format.viral
        ? await generateViralAttempt(
            apiKey,
            model,
            app.name,
            app.description ?? '',
            profile,
            profileJson,
            selection,
            bannedWords,
          )
        : selection.format.meme
        ? await generateMemeAttempt(
            apiKey,
            model,
            app.name,
            app.description ?? '',
            profile,
            profileJson,
            selection,
            bannedWords,
            memeConfig.backgroundMode === 'stock',
          )
        : await generateAttempt(
        apiKey,
        model,
        app.name,
        profile,
        profileJson,
        selection,
        bannedWords,
        selection.format.igFormat === 'CAROUSEL' && brandKit
          ? carouselRules(
              brandKit,
              screenshotFeatures,
              selection.format.stockPolicy ?? 'never',
              selection.format.variant,
            )
          : selection.format.igFormat === 'IMAGE' && brandKit
            ? imageRules(brandKit, selection.format.stockPolicy ?? 'never')
            : '',
        { screenshotIds: screenshotFeatures.map((f) => f.id) },
      );
      if (result.kind === 'skip') {
        await writeLog(client, owner, {
          appId,
          formatId: selection.format.id,
          model,
          tokens: result.tokens,
          completionTokens: result.completion,
          startedAt,
          outcome: 'SKIPPED',
          error: result.reason,
        });
        continue;
      }
      attempt = result.attempt;
    } catch (error) {
      await writeLog(client, owner, {
        appId,
        formatId: selection.format.id,
        model,
        tokens: 0,
        completionTokens: 0,
        startedAt,
        outcome: 'FAILED',
        error: describeError(error),
      });
      throw error;
    }
  }

  if (!attempt) {
    throw new HttpError(
      422,
      'Could not produce a piece: the profile is missing facts for the drawn formats.',
    );
  }

  const { format } = attempt.selection;
  const memeContext: MemeContext | undefined =
    format.meme && attempt.selection.video
      ? {
          video: attempt.selection.video,
          config: memeConfig,
          backgroundColor: memeBackgroundColor,
        }
      : undefined;
  const assets = await fetchAssets(format, attempt.payload, memeContext);
  log('assets.fetched', { count: assets.length, igFormat: format.igFormat });
  const fields = toPieceFields(
    format,
    attempt.payload,
    memeContext,
    assets.length > 0,
    format.viral && attempt.selection.viralVideo
      ? { video: attempt.selection.viralVideo, config: viralConfig }
      : undefined,
  );

  const common = {
    title: fields.title,
    type: contentType(format),
    igFormat: format.igFormat,
    formatId: format.id,
    personaId: attempt.selection.personaId,
    featureId: attempt.selection.featureId,
    pillar: attempt.selection.pillar,
    scriptJson: fields.scriptJson,
    caption: fields.caption ?? undefined,
    hashtags: fields.hashtags,
    overlayText: fields.overlayText ?? undefined,
    videoKeywords: fields.videoKeywords,
    videoConfigurations: fields.videoConfigurations ?? undefined,
    status: 'DRAFT' as const,
  };

  let piece: ContentRow | null;
  if (input.replacePieceId) {
    const old = await client.models.Content.get({ id: input.replacePieceId });
    const oldAssets = await client.models.Asset.list({
      filter: { pieceId: { eq: input.replacePieceId } },
    });
    await Promise.all(
      oldAssets.data.map((a) => client.models.Asset.delete({ id: a.id })),
    );
    const updated = await client.models.Content.update({
      id: input.replacePieceId,
      ...common,
      regenCount: (old.data?.regenCount ?? 0) + 1,
    });
    const updateError = logGqlErrors('Content.update', updated.errors);
    if (updateError) throw new HttpError(502, `Failed to update draft: ${updateError}`);
    piece = updated.data;
  } else {
    const created = await client.models.Content.create({
      appId,
      owner,
      regenCount: 0,
      ...common,
    });
    const createError = logGqlErrors('Content.create', created.errors);
    if (createError) throw new HttpError(502, `Failed to save draft: ${createError}`);
    piece = created.data;
  }
  if (!piece) throw new HttpError(502, 'Failed to save draft.');
  log('piece.saved', { pieceId: piece.id });

  if (assets.length) {
    log('asset.create', {
      count: assets.length,
      keys: [
        'pieceId',
        'source',
        'sourceUrl',
        'licence',
        'type',
        'beatIndex',
        'url',
        'previewUrl',
        'query',
        'owner',
      ],
    });
  }
  for (const asset of assets) {
    const createdAsset = await client.models.Asset.create({
      pieceId: piece.id,
      source: asset.source,
      sourceUrl: asset.sourceUrl,
      licence: asset.licence,
      type: asset.type,
      beatIndex: asset.beatIndex,
      url: asset.url,
      previewUrl: asset.previewUrl,
      query: asset.query,
      owner,
    });
    const assetError = logGqlErrors('Asset.create', createdAsset.errors);
    if (assetError) {
      throw new HttpError(502, `Failed to save asset: ${assetError}`);
    }
  }

  await writeLog(client, owner, {
    appId,
    pieceId: piece.id,
    formatId: format.id,
    model,
    tokens: attempt.promptTokens,
    completionTokens: attempt.completionTokens,
    startedAt: Date.now(),
    outcome: 'OK',
  });

  const nextUsed = await bumpUsage(client, appId, localDate, owner, used);
  log('run.done', { pieceId: piece.id, used: nextUsed });
  return {
    piece,
    used: nextUsed,
    limit: input.unlimited ? null : DAILY_LIMIT,
  };
}

async function createClient(): Promise<DataClient> {
  const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(
    process.env as unknown as Parameters<typeof getAmplifyDataClientConfig>[0],
  );
  Amplify.configure(resourceConfig, libraryOptions);
  log('client.configured');
  return generateClient<Schema>();
}

/** Accepts a reel `subtype` key, or the legacy `reelKind` value. */
function reelKindFrom(body: Record<string, unknown>): 'meme' | 'viral' | undefined {
  if (body.subtype === 'reel.green-screen') return 'meme';
  if (body.subtype === 'reel.tweet-style') return 'viral';
  if (body.reelKind === 'meme' || body.reelKind === 'viral') {
    return body.reelKind;
  }
  return undefined;
}

async function handleGenerate(event: ApiEvent): Promise<ApiResult> {
  const body = readBody(event);
  const owner = callerOwner(event);
  const client = await createClient();
  await prepare(client);
  const result = await runGeneration({
    client,
    owner,
    appId: requireString(body, 'appId'),
    localDate: requireLocalDate(body),
    unlimited: isAdmin(event),
    igFormat: readIgFormat(body.igFormat),
    reelKind: reelKindFrom(body),
  });
  return jsonResponse(200, result);
}

async function handleRegenerate(event: ApiEvent): Promise<ApiResult> {
  const body = readBody(event);
  const owner = callerOwner(event);
  const client = await createClient();
  await prepare(client);
  const pieceId = requireString(body, 'pieceId');

  const { data: piece } = await client.models.Content.get({ id: pieceId });
  if (!piece) throw new HttpError(404, 'Piece not found.');
  if (!piece.owner || !ownerMatches(piece.owner, owner)) {
    throw new HttpError(403, 'Not your content.');
  }
  if (piece.status === 'APPROVED') {
    throw new HttpError(409, 'Approved pieces cannot be regenerated.');
  }

  const format = piece.formatId ? getFormat(piece.formatId) : undefined;
  if (!format || !piece.personaId || !piece.featureId || !piece.pillar) {
    throw new HttpError(422, 'This piece has no generation history.');
  }

  const result = await runGeneration({
    client,
    owner,
    appId: piece.appId,
    localDate: requireLocalDate(body),
    replacePieceId: piece.id,
    unlimited: isAdmin(event),
    forced: {
      format,
      personaId: piece.personaId,
      featureId: piece.featureId,
      pillar: piece.pillar,
    },
  });
  return jsonResponse(200, result);
}

/**
 * Admin only: runs one format against an app's profile and returns the raw
 * output. Nothing is saved and the daily limit is not touched.
 */
async function handleTestGenerate(event: ApiEvent): Promise<ApiResult> {
  if (!isAdmin(event)) throw new HttpError(403, 'Admins only.');
  const body = readBody(event);
  const owner = callerOwner(event);
  const client = await createClient();
  clearStoreCache();
  await prepare(client);

  const formatId = Number(body.formatId);
  const format = Number.isFinite(formatId) ? getFormat(formatId) : undefined;
  if (!format) throw new HttpError(404, 'Format not found.');
  const appId = requireString(body, 'appId');
  const { data: app } = await client.models.Apps.get({ id: appId });
  if (!app) throw new HttpError(404, 'App not found.');
  if (app.owner && !ownerMatches(app.owner, owner)) {
    throw new HttpError(403, 'Not your app.');
  }

  const profileRows = await client.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  });
  const profile = parseProfile(profileRows.data[0]);
  const personas = profile.personas.filter((p) => p.name?.trim());
  const features = profile.features.filter((f) => f.name?.trim());
  if (!personas.length || !features.length) {
    throw new HttpError(422, 'The app needs at least one persona and one feature.');
  }
  const brandKit = readBrandKit(profile.brand, app.logo);
  if ((format.igFormat === 'CAROUSEL' || format.igFormat === 'IMAGE') && !brandKit) {
    throw new HttpError(422, 'The app needs a complete brand kit for this format.');
  }

  const selection: Selection = {
    format,
    personaId: pickRandom(personas).id,
    featureId: pickRandom(features).id,
    pillar: pickRandom(PILLARS),
  };
  if (format.meme) {
    const videos = await listMemeVideos(client);
    if (!videos.length) throw new HttpError(422, 'No green screen videos in the library.');
    selection.video = pickRandom(videos);
  }
  if (format.viral) {
    const videos = await listViralVideos(client);
    if (!videos.length) throw new HttpError(422, 'No viral videos in the library.');
    selection.viralVideo = pickRandom(videos);
  }

  const apiKey = await loadOpenAiKey();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const profileJson = JSON.stringify(profile);
  const bannedWords = parseBannedWords(profile.voice);
  const screenshotFeatures = profile.features
    .filter((f) => (f.screenshot ?? '').trim())
    .map((f) => ({ id: f.id, name: f.name }));

  try {
    const result = format.viral
      ? await generateViralAttempt(
          apiKey,
          model,
          app.name,
          app.description ?? '',
          profile,
          profileJson,
          selection,
          bannedWords,
        )
      : format.meme
        ? await generateMemeAttempt(
            apiKey,
            model,
            app.name,
            app.description ?? '',
            profile,
            profileJson,
            selection,
            bannedWords,
            true,
          )
        : await generateAttempt(
            apiKey,
            model,
            app.name,
            profile,
            profileJson,
            selection,
            bannedWords,
            format.igFormat === 'CAROUSEL' && brandKit
              ? carouselRules(
                  brandKit,
                  screenshotFeatures,
                  format.stockPolicy ?? 'never',
                  format.variant,
                )
              : format.igFormat === 'IMAGE' && brandKit
                ? imageRules(brandKit, format.stockPolicy ?? 'never')
                : '',
            { screenshotIds: screenshotFeatures.map((f) => f.id) },
          );
    if (result.kind === 'skip') {
      return jsonResponse(200, {
        ok: true,
        skipped: result.reason,
        tokens: result.tokens + result.completion,
      });
    }
    return jsonResponse(200, {
      ok: true,
      payload: result.attempt.payload,
      tokens: result.attempt.promptTokens + result.attempt.completionTokens,
      cost:
        estimateCost(
          model,
          result.attempt.promptTokens,
          result.attempt.completionTokens,
        ) ?? null,
      persona: personas.find((p) => p.id === selection.personaId)?.name,
      feature: features.find((f) => f.id === selection.featureId)?.name,
      pillar: selection.pillar,
      video: selection.video?.title ?? selection.viralVideo?.title,
    });
  } catch (error) {
    if (error instanceof HttpError && error.status === 422) {
      return jsonResponse(200, { ok: false, error: error.message });
    }
    throw error;
  }
}

const DRAFT_IG_FORMATS = ['REEL', 'CAROUSEL', 'IMAGE', 'STORY'];
const DRAFT_LAYOUTS = ['card', 'grid', 'columns', 'stack'];
const DRAFT_VARIANTS = [
  'steps',
  'checklist',
  'split',
  'stat',
  'quote',
  'tier',
  'cards',
  'chat',
  'level',
  'timeline',
  'grid',
  'flags',
  'editorial',
  'template',
  'poster',
];
const DRAFT_STOCK = ['never', 'allowed', 'preferred'];
const DRAFT_INPUTS = [
  'competitors',
  'features.screenshot',
  'proof.reviews',
  'proof.comments',
  'proof.stats',
  'proof.milestones',
  'proof.news',
  'proof.offers',
  'proof.images',
];
const DRAFT_PLACEHOLDERS = [
  '{{app_name}}',
  '{{persona}}',
  '{{pillar}}',
  '{{feature}}',
  '{{app_profile_json}}',
];

function positiveInt(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * Admin only: turns a free-text description into a filled format form. The
 * result is returned for review, nothing is saved.
 */
async function handleDraftFormat(event: ApiEvent): Promise<ApiResult> {
  if (!isAdmin(event)) throw new HttpError(403, 'Admins only.');
  callerOwner(event);
  const body = readBody(event);
  const description = requireString(body, 'description');
  if (description.length > 4000) {
    throw new HttpError(400, 'Description is too long (max 4000 characters).');
  }
  const client = await createClient();
  clearStoreCache();
  await prepare(client);

  const standard = FORMATS.filter((f) => !f.meme && !f.viral);
  const examples = [...standard]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((f) => ({
      name: f.name,
      group: f.group,
      igFormat: f.igFormat,
      structure: f.structure,
      hooks: f.hooks.slice(0, 3),
      promptTemplate: f.promptTemplate.slice(0, 700),
      sharpen: f.sharpen ?? '',
      layout: f.layout ?? '',
      variant: f.variant ?? '',
      lineCount: f.lineCount ?? 0,
      stockPolicy: f.stockPolicy ?? 'never',
    }));
  const groups = [...new Set(FORMATS.map((f) => f.group).filter(Boolean))];

  const p = prompts();
  const system = p.fill(p.get('admin.format_draft'), {
    groups: groups.join(', '),
    inputs: DRAFT_INPUTS.join(', '),
    variants: DRAFT_VARIANTS.join(', '),
    examples: JSON.stringify(examples, null, 1),
  });

  const apiKey = await loadOpenAiKey();
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const result = await callOpenAi(
    apiKey,
    model,
    system,
    description,
    FORMAT_DRAFT_SCHEMA,
  );
  const raw = result.payload as unknown as FormatDraft;

  let promptTemplate = (raw.promptTemplate ?? '').trim();
  const missing = DRAFT_PLACEHOLDERS.some((token) => !promptTemplate.includes(token));
  if (missing) {
    promptTemplate = `App: {{app_name}} | Persona: {{persona}} | Pillar: {{pillar}} | Feature to feature: {{feature}}\nApp Profile: {{app_profile_json}}\n\n${promptTemplate}`.trim();
  }
  const igFormat = DRAFT_IG_FORMATS.includes(raw.igFormat) ? raw.igFormat : 'REEL';
  const format = {
    name: (raw.name ?? '').trim(),
    groupName: (raw.groupName ?? '').trim(),
    igFormat,
    structure: (raw.structure ?? '').trim(),
    visual: (raw.visual ?? '').trim(),
    cta: (raw.cta ?? '').trim(),
    shareTrigger: (raw.shareTrigger ?? '').trim(),
    hooks: (raw.hooks ?? []).map((h) => h.trim()).filter(Boolean).slice(0, 8),
    promptTemplate,
    extraRules: (raw.extraRules ?? '').trim(),
    sharpen: (raw.sharpen ?? '').trim(),
    requiredInputs: (raw.requiredInputs ?? []).filter((input) =>
      DRAFT_INPUTS.includes(input),
    ),
    layout:
      igFormat === 'IMAGE' && DRAFT_LAYOUTS.includes(raw.layout) ? raw.layout : '',
    variant:
      igFormat === 'CAROUSEL' && DRAFT_VARIANTS.includes(raw.variant)
        ? raw.variant
        : '',
    lineCount: igFormat === 'IMAGE' ? positiveInt(raw.lineCount) : 0,
    slideMin: igFormat === 'CAROUSEL' ? positiveInt(raw.slideMin) : 0,
    slideMax: igFormat === 'CAROUSEL' ? positiveInt(raw.slideMax) : 0,
    stockPolicy: DRAFT_STOCK.includes(raw.stockPolicy) ? raw.stockPolicy : 'never',
  };
  return jsonResponse(200, {
    format,
    tokens: result.promptTokens + result.completionTokens,
  });
}

async function handleStockSearch(event: ApiEvent): Promise<ApiResult> {
  callerOwner(event);
  const body = readBody(event);
  const query = requireString(body, 'query');
  const type = body.type === 'IMAGE' ? 'IMAGE' : 'VIDEO';
  const page =
    typeof body.page === 'number' && body.page >= 1 ? Math.floor(body.page) : 1;
  const minSeconds =
    typeof body.minSeconds === 'number' && body.minSeconds > 0
      ? body.minSeconds
      : 0;
  const results =
    type === 'VIDEO'
      ? await searchVideos(query, page, minSeconds)
      : await searchImages(query, page);
  return jsonResponse(200, { results });
}

/**
 * HTTP API behind a Cognito JWT authorizer.
 * - POST /content/generate   { appId, localDate, igFormat?, reelKind?: 'meme' | 'viral', subtype?: string }
 * - POST /content/regenerate { pieceId, localDate }
 * - POST /content/stock-search { query, type, page?, minSeconds? }
 */
export const handler = async (event: ApiEvent): Promise<ApiResult> => {
  try {
    const path = event.rawPath ?? '';
    const claims = event.requestContext?.authorizer?.jwt?.claims ?? {};
    log('request', {
      path,
      groups: callerGroups(event),
      hasBody: Boolean(event.body),
      claimKeys: Object.keys(claims),
      hasSub: typeof claims.sub === 'string',
      hasUsername:
        typeof claims.username === 'string' ||
        typeof claims['cognito:username'] === 'string',
      tokenUse: claims.token_use,
    });
    if (path.endsWith('/content/generate')) return await handleGenerate(event);
    if (path.endsWith('/content/regenerate')) {
      return await handleRegenerate(event);
    }
    if (path.endsWith('/content/draft-format')) {
      return await handleDraftFormat(event);
    }
    if (path.endsWith('/content/test-generate')) {
      return await handleTestGenerate(event);
    }
    if (path.endsWith('/content/stock-search')) {
      return await handleStockSearch(event);
    }
    return jsonResponse(404, { message: 'Not found.' });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse(error.status, { message: error.message });
    }
    console.error(
      JSON.stringify({
        scope: 'generate-content',
        step: 'failed',
        message: describeError(error),
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
    return jsonResponse(500, { message: describeError(error) });
  }
};
