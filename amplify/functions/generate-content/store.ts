import type { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource';
import type {
  CarouselLayout,
  FormatEntry,
  IgFormat,
  Layout,
} from './catalog';
import { HttpError } from './errors';

type DataClient = ReturnType<typeof generateClient<Schema>>;

const TTL_MS = 60_000;
const SEED_HINT = 'Run npm run seed:formats.';

interface Cached<T> {
  at: number;
  value: T;
}

let formatCache: Cached<FormatEntry[]> | null = null;
let promptCache: Cached<Map<string, { value: string; enabled: boolean; required: boolean }>> | null =
  null;

function fresh<T>(entry: Cached<T> | null): entry is Cached<T> {
  return entry !== null && Date.now() - entry.at < TTL_MS;
}

/** Drops the caches. Used by test-generate so edits show up at once. */
export function clearStoreCache(): void {
  formatCache = null;
  promptCache = null;
}

function clean(list: Array<string | null> | null | undefined): string[] {
  return (list ?? []).filter((item): item is string => !!item);
}

function toEntry(row: Schema['FormatDef']['type']): FormatEntry {
  const kind =
    row.kind === 'meme' || row.kind === 'viral' ? row.kind : 'standard';
  const slideRange: [number, number] | undefined =
    row.slideMin && row.slideMax ? [row.slideMin, row.slideMax] : undefined;
  const stock = row.stockPolicy;
  return {
    id: row.formatId,
    name: row.name,
    group: row.groupName ?? '',
    igFormat: (row.igFormat ?? 'REEL') as IgFormat,
    igFormatLabel: row.igFormatLabel ?? '',
    repostAs: row.repostAs ?? '',
    isMeme: row.isMeme ?? false,
    structure: row.structure ?? '',
    hooks: clean(row.hooks),
    visual: row.visual ?? '',
    cta: row.cta ?? '',
    shareTrigger: row.shareTrigger ?? '',
    promptTemplate: row.promptTemplate ?? '',
    extraRules: row.extraRules ?? '',
    requiredInputs: clean(row.requiredInputs),
    layout: (row.layout || undefined) as Layout | undefined,
    lineCount: row.lineCount ?? undefined,
    sharpen: row.sharpen || undefined,
    slideRange,
    variant: (row.variant || undefined) as CarouselLayout | undefined,
    stockPolicy:
      stock === 'allowed' || stock === 'preferred' || stock === 'never'
        ? stock
        : undefined,
    kind,
    meme: kind === 'meme',
    viral: kind === 'viral',
    enabled: row.enabled,
    sortOrder: row.sortOrder ?? 0,
  };
}

/** All formats (enabled and disabled), cached for a minute. */
export async function loadFormats(client: DataClient): Promise<FormatEntry[]> {
  if (fresh(formatCache)) return formatCache.value;
  const rows: Array<Schema['FormatDef']['type']> = [];
  let nextToken: string | null | undefined;
  do {
    const page = await client.models.FormatDef.list({
      limit: 500,
      nextToken,
    });
    if (page.errors?.length) {
      throw new HttpError(
        502,
        `Could not load formats: ${page.errors[0].message}`,
      );
    }
    rows.push(...page.data);
    nextToken = page.nextToken;
  } while (nextToken);
  if (!rows.length) {
    throw new HttpError(503, `Formats are not seeded. ${SEED_HINT}`);
  }
  const value = rows.map(toEntry).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  formatCache = { at: Date.now(), value };
  return value;
}

export interface Prompts {
  /** Required text. Throws a 503 when the snippet is missing. */
  get(key: string): string;
  /** Optional text. Empty string when missing or disabled. */
  optional(key: string): string;
  /** Replaces {{name}} placeholders and drops lines left empty. */
  fill(template: string, vars: Record<string, string>): string;
}

export async function loadPrompts(client: DataClient): Promise<Prompts> {
  if (!fresh(promptCache)) {
    const map = new Map<
      string,
      { value: string; enabled: boolean; required: boolean }
    >();
    let nextToken: string | null | undefined;
    do {
      const page = await client.models.PromptSnippet.list({
        limit: 500,
        nextToken,
      });
      if (page.errors?.length) {
        throw new HttpError(
          502,
          `Could not load prompts: ${page.errors[0].message}`,
        );
      }
      for (const row of page.data) {
        map.set(row.key, {
          value: row.value,
          enabled: row.enabled,
          required: row.required ?? false,
        });
      }
      nextToken = page.nextToken;
    } while (nextToken);
    if (!map.size) {
      throw new HttpError(503, `Prompts are not seeded. ${SEED_HINT}`);
    }
    promptCache = { at: Date.now(), value: map };
  }
  const map = promptCache.value;
  return {
    get(key) {
      const row = map.get(key);
      if (!row) {
        throw new HttpError(
          503,
          `Prompt "${key}" is missing. ${SEED_HINT}`,
        );
      }
      return row.value;
    },
    optional(key) {
      const row = map.get(key);
      if (!row || (!row.enabled && !row.required)) return '';
      return row.value;
    },
    fill(template, vars) {
      let out = template;
      for (const [name, value] of Object.entries(vars)) {
        out = out.replaceAll(`{{${name}}}`, value);
      }
      return out
        .split('\n')
        .filter((line) => line.trim() !== '' && line.trim() !== '-')
        .join('\n');
    },
  };
}
