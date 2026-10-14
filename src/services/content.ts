import { fetchAuthSession } from 'aws-amplify/auth'
import { dataClient, type Schema } from '@/lib/amplify'
import outputs from '../../amplify_outputs.json'

/** Shape of a Content record returned by the backend. */
export type ContentItem = Schema['Content']['type']

/** Piece schema values (mirrors the `IgFormat` enum in the backend). */
export type IgFormat = NonNullable<ContentItem['igFormat']>

/** Content status values (mirrors the `ContentStatus` enum in the backend). */
export type ContentStatus = NonNullable<ContentItem['status']>

/** Content type values (mirrors the `ContentType` enum in the backend). */
export type ContentType = NonNullable<ContentItem['type']>

export const CONTENT_STATUSES = [
  'DRAFT',
  'APPROVED',
  'DISCARDED',
] as const satisfies readonly ContentStatus[]

export const CONTENT_TYPES = [
  'SHORT_FORM_VIDEO',
  'CAROUSEL',
  'MEME',
  'SINGLE_IMAGE',
  'TEXT_POST',
] as const satisfies readonly ContentType[]

/** Human-readable label for an enum value (`READY_FOR_RENDER` → `Ready for render`). */
export function formatEnum(value: string): string {
  const lower = value.toLowerCase().replace(/_/g, ' ')
  return lower.charAt(0).toUpperCase() + lower.slice(1)
}

/** Input for creating or updating a Content record. JSON fields are strings. */
export interface ContentInput {
  appId: string
  title: string
  status?: ContentStatus
  approvedAt?: string
  scriptJson?: string
  postedOn?: string
  angel?: string
  relatabilityHook?: string
  overlayText?: string | null
  videoKeywords?: string[]
  videoConfigurations?: string
  audioConfig?: string
  caption?: string
  hashtags?: string[]
  targetPersona?: string
  type?: ContentType
}

/** Input for updating an existing Content. `appId` is immutable. */
export type ContentUpdate = Partial<Omit<ContentInput, 'appId'>> & { id: string }

/**
 * CRUD service for the `Content` table. Content belongs to exactly one App
 * (`appId`); all calls are authenticated and enforced server-side.
 */

export async function listContentByApp(appId: string): Promise<ContentItem[]> {
  const { data, errors } = await dataClient.models.Content.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function getContent(id: string): Promise<ContentItem | null> {
  const { data, errors } = await dataClient.models.Content.get({ id })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function createContent(
  input: ContentInput,
): Promise<ContentItem | null> {
  const { data, errors } = await dataClient.models.Content.create(input)
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function updateContent(
  input: ContentUpdate,
): Promise<ContentItem | null> {
  const { data, errors } = await dataClient.models.Content.update(input)
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

export async function deleteContent(id: string): Promise<void> {
  const { errors } = await dataClient.models.Content.delete({ id })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
}

export const DAILY_GENERATION_LIMIT = 5

/** Today's date in the user's local time zone as YYYY-MM-DD. */
export function localDateString(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Result of one generation: the saved piece and today's usage for the app. */
export interface GenerationResult {
  piece: ContentItem
  used: number
  limit: number | null
}

/** One stock media result returned by the stock-search endpoint. */
export interface StockResult {
  source: string
  sourceUrl: string
  licence: string
  type: 'VIDEO' | 'IMAGE'
  url: string
  previewUrl: string
  query: string
}

async function callContentApi<T>(path: string, body: object): Promise<T> {
  const baseUrl = (
    outputs as { custom?: { GENERATE_CONTENT_API_URL?: string } }
  ).custom?.GENERATE_CONTENT_API_URL
  if (!baseUrl) {
    throw new Error(
      'GENERATE_CONTENT_API_URL missing from amplify_outputs.json. Redeploy the backend.',
    )
  }

  const session = await fetchAuthSession()
  const token = session.tokens?.accessToken?.toString()
  if (!token) {
    throw new Error('You must be signed in to generate content.')
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json().catch(() => null)) as
    | T
    | { message?: string }
    | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message?: string }).message
        : undefined
    throw new Error(message ?? `Request failed (${response.status}).`)
  }
  if (!payload) {
    throw new Error('Empty response from content API.')
  }
  return payload as T
}

/** POST /content/generate: one tap creates exactly one DRAFT piece. */
export function generateContentDraft(
  appId: string,
  igFormat?: IgFormat,
  reelKind?: 'meme' | 'viral',
): Promise<GenerationResult> {
  return callContentApi<GenerationResult>('/content/generate', {
    appId,
    localDate: localDateString(),
    igFormat,
    reelKind,
  })
}

/** POST /content/regenerate: replaces a draft with a new one, same picks. */
export function regenerateContent(pieceId: string): Promise<GenerationResult> {
  return callContentApi<GenerationResult>('/content/regenerate', {
    pieceId,
    localDate: localDateString(),
  })
}

/** POST /content/stock-search: alternatives for a beat or slide. */
export async function searchStock(
  query: string,
  type: 'VIDEO' | 'IMAGE',
  page = 1,
  minSeconds = 0,
): Promise<StockResult[]> {
  const { results } = await callContentApi<{ results: StockResult[] }>(
    '/content/stock-search',
    { query, type, page, minSeconds },
  )
  return results
}

/** Generations used today for an app (0 when none). */
export async function getUsageToday(appId: string): Promise<number> {
  const { data, errors } = await dataClient.models.DailyUsage.get({
    id: `${appId}#${localDateString()}`,
  })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data?.count ?? 0
}

export async function approveContent(id: string): Promise<ContentItem | null> {
  return updateContent({
    id,
    status: 'APPROVED',
    approvedAt: new Date().toISOString(),
  })
}

/** Discarded pieces are deleted for good (open item 4 default). */
export async function discardContent(id: string): Promise<void> {
  const assets = await dataClient.models.Asset.list({
    filter: { pieceId: { eq: id } },
  })
  await Promise.all(
    assets.data.map((asset) => dataClient.models.Asset.delete({ id: asset.id })),
  )
  await deleteContent(id)
}

/** All drafts waiting for review, newest first. Owner rules scope the list. */
export async function listDrafts(): Promise<ContentItem[]> {
  const { data, errors } = await dataClient.models.Content.list({
    filter: { status: { eq: 'DRAFT' } },
  })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return [...data].sort((a, b) =>
    (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
  )
}

/** True when the signed-in user belongs to the Cognito `admin` group. */
export async function isAdminUser(): Promise<boolean> {
  const session = await fetchAuthSession()
  const groups = session.tokens?.accessToken?.payload['cognito:groups']
  return Array.isArray(groups) && groups.includes('admin')
}

/** Result of an admin test run: raw output, nothing saved. */
export interface TestGenerateResult {
  ok: boolean
  error?: string
  skipped?: string
  payload?: unknown
  tokens?: number
  cost?: number | null
  persona?: string
  feature?: string
  pillar?: string
  video?: string
}

/** Fields the AI fills in for a new format. */
export interface FormatDraftResult {
  format: {
    name: string
    groupName: string
    igFormat: string
    structure: string
    visual: string
    cta: string
    shareTrigger: string
    hooks: string[]
    promptTemplate: string
    extraRules: string
    sharpen: string
    requiredInputs: string[]
    layout: string
    variant: string
    lineCount: number
    slideMin: number
    slideMax: number
    stockPolicy: string
  }
  tokens: number
}

/** POST /content/draft-format: admin only, free text in, filled form out. */
export function draftFormat(description: string): Promise<FormatDraftResult> {
  return callContentApi<FormatDraftResult>('/content/draft-format', {
    description,
  })
}

/** POST /content/test-generate: admin only, runs one format against an app. */
export function testGenerate(
  formatId: number,
  appId: string,
): Promise<TestGenerateResult> {
  return callContentApi<TestGenerateResult>('/content/test-generate', {
    formatId,
    appId,
  })
}
