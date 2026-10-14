import { dataClient, type Schema } from '@/lib/amplify'
import { deleteMedia, uploadMedia } from '@/services/storage'

export type StockAssetRow = Schema['StockAsset']['type']

/** Categories the app knows by name. Others can be typed in the library. */
export const STOCK_CATEGORIES = [
  {
    key: 'green-screen',
    label: 'Green screen',
    hint: 'Meme reels. Needs the key colour.',
    keyed: true,
  },
  {
    key: 'viral-clip',
    label: 'Viral clips',
    hint: 'Tweet-style reels. Played once, up to 30s.',
    keyed: false,
  },
] as const

export function categoryLabel(key: string): string {
  return STOCK_CATEGORIES.find((c) => c.key === key)?.label ?? key
}

export interface StockInput {
  category: string
  title: string
  keywords: string[]
  keyColor?: string
  durationSeconds?: number
}

export async function listStockAssets(): Promise<StockAssetRow[]> {
  const rows: StockAssetRow[] = []
  let nextToken: string | null | undefined
  do {
    const page = await dataClient.models.StockAsset.list({
      limit: 500,
      nextToken,
    })
    if (page.errors?.length) throw new Error(page.errors[0].message)
    rows.push(...page.data)
    nextToken = page.nextToken
  } while (nextToken)
  return rows.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
}

/** Uploads the file to S3 under media/stock/, then records it in the library. */
export async function createStockAsset(
  file: File,
  input: StockInput,
): Promise<StockAssetRow> {
  const assetKey = await uploadMedia(file, 'stock')
  const { data, errors } = await dataClient.models.StockAsset.create({
    ...input,
    assetKey,
    mediaType: file.type.startsWith('image/') ? 'IMAGE' : 'VIDEO',
    enabled: true,
  })
  if (errors?.length || !data) {
    await deleteMedia(assetKey).catch(() => undefined)
    throw new Error(errors?.[0]?.message ?? 'Asset was not saved.')
  }
  return data
}

export async function updateStockAsset(
  id: string,
  patch: Partial<StockInput> & { enabled?: boolean },
): Promise<StockAssetRow> {
  const { data, errors } = await dataClient.models.StockAsset.update({
    id,
    ...patch,
  })
  if (errors?.length || !data) {
    throw new Error(errors?.[0]?.message ?? 'Asset was not saved.')
  }
  return data
}

export async function deleteStockAsset(row: StockAssetRow): Promise<void> {
  const { errors } = await dataClient.models.StockAsset.delete({ id: row.id })
  if (errors?.length) throw new Error(errors[0].message)
  await deleteMedia(row.assetKey).catch(() => undefined)
}

/** Reads the duration of a local video file in the browser. */
export function readVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.preload = 'metadata'
    const done = (value: number) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.addEventListener('loadedmetadata', () =>
      done(Number.isFinite(video.duration) ? video.duration : 0),
    )
    video.addEventListener('error', () => done(0))
    video.src = url
  })
}

export interface CategoryAsset {
  id: string
  title: string
  keywords?: Array<string | null> | null
}

/**
 * Enabled assets of one category. Falls back to the old per-kind tables
 * until `npm run migrate:reels` has copied them into the library.
 */
export async function listCategoryAssets(
  category: string,
): Promise<CategoryAsset[]> {
  const rows = (await listStockAssets()).filter(
    (row) => row.category === category && row.enabled !== false,
  )
  if (rows.length) return rows
  if (category === 'green-screen') {
    const { data } = await dataClient.models.GreenScreenVideo.list({ limit: 1000 })
    return data
  }
  if (category === 'viral-clip') {
    const { data } = await dataClient.models.ViralVideo.list({ limit: 1000 })
    return data
  }
  return []
}
