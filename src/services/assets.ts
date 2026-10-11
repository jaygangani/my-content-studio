import { dataClient, type Schema } from '@/lib/amplify'
import type { StockResult } from '@/services/content'

export type AssetItem = Schema['Asset']['type']

export async function listAssets(pieceId: string): Promise<AssetItem[]> {
  const { data, errors } = await dataClient.models.Asset.list({
    filter: { pieceId: { eq: pieceId } },
  })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  return data
}

/** Replaces the asset at `beatIndex`, keeping source and licence on record. */
export async function replaceAsset(
  pieceId: string,
  beatIndex: number,
  existing: AssetItem | undefined,
  next: StockResult,
): Promise<AssetItem> {
  const fields = {
    source: next.source,
    sourceUrl: next.sourceUrl,
    licence: next.licence,
    type: next.type,
    url: next.url,
    previewUrl: next.previewUrl,
    query: next.query,
  }
  const result = existing
    ? await dataClient.models.Asset.update({ id: existing.id, ...fields })
    : await dataClient.models.Asset.create({ pieceId, beatIndex, ...fields })
  if (result.errors?.length) {
    throw new Error(result.errors[0].message)
  }
  if (!result.data) throw new Error('Asset was not saved.')
  return result.data
}
