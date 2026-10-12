import type { Schema } from '../../data/resource';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {
  FORMATS,
  PILLARS,
  SYSTEM_PROMPT,
  TEXT_STYLE_KEYS,
  getFormat,
  inputsSatisfied,
  pickAvoiding,
  pickRandom,
  pillarLabel,
} from './catalog';
import type { FormatEntry, Pillar, ProfileJson } from './catalog';
import { callOpenAi, estimateCost, loadOpenAiKey } from './openai';
import { SCHEMAS } from './schemas';
import type {
  CarouselPayload,
  GeneratedPayload,
  ImagePayload,
  ReelPayload,
} from './schemas';
import { findAsset, searchImages, searchVideos } from './stock';
import type { StockAsset } from './stock';
import {
  findInventedFacts,
  parseBannedWords,
  validatePayload,
} from './validate';

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

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

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

interface Selection {
  format: FormatEntry;
  personaId: string;
  featureId: string;
  pillar: Pillar;
}

interface Attempt {
  selection: Selection;
  payload: GeneratedPayload;
  promptTokens: number;
  completionTokens: number;
}

const ADDENDUM = [
  'Output notes for this run:',
  '- Always fill every field of the JSON schema. Use an empty string for "skip" when the piece is produced.',
  '- If a required fact is missing from the App Profile, set "skip" to a short reason and leave the rest empty.',
  '- Reel beats: 5-10 words each, total of all beat seconds between 15 and 30.',
  '- Reel: the text of beat 1 IS the hook (use the same wording as "hook") and the text of the LAST beat IS the call to action (same wording as "cta"). There is no separate title or CTA on screen.',
  '- Hook: at most 8 words. Slide headlines: at most 8 words. Slide bodies: at most 25 words.',
  '- Every number, stat, review, comment, offer or milestone must come from the App Profile.',
  '',
  'Sharpness rules (apply to every piece):',
  '- Specificity test: if a line could be pasted into a post for a different app unchanged, rewrite it.',
  '- Name the exact moment: what the persona typed, tapped, searched, said or saw, with a time, number or object.',
  '- Use the persona\'s own words and daily moments from the profile. Prefer a concrete noun over an abstract one (a tab, a notebook, a 1am search, not "productivity").',
  '- Banned filler: "journey", "game changer", "level up", "unlock", "hack", "in today\'s world", "it takes time", labels like Organized or Chaotic.',
  '- The first line must create tension or an open question the viewer needs resolved.',
  '- Write for a total beginner who knows nothing yet: no jargon without a plain-word translation, and show the confusion they actually feel.',
  '- Funny beats true: the most relatable detail goes last, and the app appears only in the CTA or as the one fix.',
].join('\n');

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
  };
}

async function generateAttempt(
  apiKey: string,
  model: string,
  appName: string,
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
  const userPrompt = fillTemplate(
    selection.format,
    profileJson,
    selection,
    persona,
    feature,
    appName,
  );
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${ADDENDUM}`;
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
      ...validatePayload(selection.format, result.payload, bannedWords),
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
): Promise<Array<StockAsset & { beatIndex: number }>> {
  const out: Array<StockAsset & { beatIndex: number }> = [];

  if (format.igFormat === 'REEL') {
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
      if (!slide.visual.trim()) continue;
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
    if (image.visual.trim()) {
      const asset = await findAsset(image.visual, 'IMAGE');
      if (asset) out.push({ ...asset, beatIndex: 0 });
    }
  }

  return out;
}

function contentType(format: FormatEntry): ContentTypeValue {
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

function toPieceFields(format: FormatEntry, payload: GeneratedPayload): PieceFields {
  if (format.igFormat === 'REEL') unifyReel(payload as ReelPayload);
  const script = JSON.stringify({
    schema: format.igFormat,
    formatId: format.id,
    formatName: format.name,
    textStyle: pickRandom(TEXT_STYLE_KEYS),
    layout: format.layout,
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

  const personas = profile.personas.filter((p) => p.name?.trim());
  const features = profile.features.filter((f) => f.name?.trim());

  let attempt: Attempt | null = null;
  const tried = new Set<number>();

  for (let draw = 0; draw <= MAX_SKIP_REDRAWS && !attempt; draw += 1) {
    let selection = input.forced;
    if (!selection || draw > 0) {
      const eligible = FORMATS.filter(
        (f) => !tried.has(f.id) && inputsSatisfied(f, profile),
      );
      if (!eligible.length) {
        throw new HttpError(422, 'No format fits the current profile.');
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
      const result = await generateAttempt(
        apiKey,
        model,
        app.name,
        profile,
        profileJson,
        selection,
        bannedWords,
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
  const assets = await fetchAssets(format, attempt.payload);
  log('assets.fetched', { count: assets.length, igFormat: format.igFormat });
  const fields = toPieceFields(format, attempt.payload);

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

async function handleGenerate(event: ApiEvent): Promise<ApiResult> {
  const body = readBody(event);
  const owner = callerOwner(event);
  const client = await createClient();
  const result = await runGeneration({
    client,
    owner,
    appId: requireString(body, 'appId'),
    localDate: requireLocalDate(body),
    unlimited: isAdmin(event),
  });
  return jsonResponse(200, result);
}

async function handleRegenerate(event: ApiEvent): Promise<ApiResult> {
  const body = readBody(event);
  const owner = callerOwner(event);
  const client = await createClient();
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
 * - POST /content/generate   { appId, localDate }
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
