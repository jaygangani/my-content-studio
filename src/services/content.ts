import { dataClient, type Schema } from '@/lib/amplify'

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
  overlayText?: string
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
