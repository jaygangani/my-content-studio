import { fetchAuthSession } from 'aws-amplify/auth'
import { dataClient, type Schema } from '@/lib/amplify'
import outputs from '../../amplify_outputs.json'

/** Shape of a Content record returned by the backend. */
export type ContentItem = Schema['Content']['type']

/** Content status values (mirrors the `ContentStatus` enum in the backend). */
export type ContentStatus = NonNullable<ContentItem['status']>

/** Content type values (mirrors the `ContentType` enum in the backend). */
export type ContentType = NonNullable<ContentItem['type']>

export const CONTENT_STATUSES = [
  'DRAFT',
  'READY',
  'RENDERING',
  'SCHEDULED',
  'PUBLISHED',
  'FAILED',
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

/** Input for the authenticated generate-content HTTP API. */
export interface GenerateContentDraftInput {
  appId: string
  type?: ContentType
}

/**
 * POST /content/generate — API Gateway + Cognito JWT (logged-in users only).
 * Lambda prompts live in the backend; response is a DRAFT Content row.
 */
export async function generateContentDraft(
  input: GenerateContentDraftInput,
): Promise<ContentItem> {
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

  const response = await fetch(`${baseUrl}/content/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  const payload = (await response.json().catch(() => null)) as
    | ContentItem
    | { message?: string }
    | null

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload
        ? (payload as { message?: string }).message
        : undefined
    throw new Error(message ?? `Generate failed (${response.status}).`)
  }
  if (!payload) {
    throw new Error('Empty response from generate API.')
  }
  return payload as ContentItem
}
