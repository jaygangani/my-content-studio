import { dataClient } from '@/lib/amplify'
import { normalizeBrand } from '@/lib/brand'
import { emptyProfile } from '@/types/profile'
import type { AppProfileData } from '@/types/profile'

/** Loaded profile plus the record id (null before the first save). */
export interface LoadedProfile {
  id: string | null
  data: AppProfileData
}

function parseJson<T extends object>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback
  try {
    const parsed: unknown =
      typeof value === 'string' ? JSON.parse(value) : value
    if (parsed && typeof parsed === 'object') {
      return { ...fallback, ...(parsed as Partial<T>) }
    }
  } catch {
    return fallback
  }
  return fallback
}

function parseRaw(value: unknown): unknown {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function parseList<T>(value: unknown): T[] {
  if (value === null || value === undefined) return []
  try {
    const parsed: unknown =
      typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export async function getProfile(appId: string): Promise<LoadedProfile> {
  const { data, errors } = await dataClient.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) {
    throw new Error(errors[0].message)
  }
  const row = data[0]
  const base = emptyProfile()
  if (!row) return { id: null, data: base }
  return {
    id: row.id,
    data: {
      personas: parseList(row.personas),
      features: parseList(row.features),
      voice: parseJson(row.voice, base.voice),
      proof: parseJson(row.proof, base.proof),
      competitors: parseList(row.competitors),
      brand: normalizeBrand(parseRaw(row.brand)),
      storeUrl: row.storeUrl ?? '',
      ctaText: row.ctaText ?? '',
    },
  }
}

export async function saveProfile(
  appId: string,
  id: string | null,
  profile: AppProfileData,
): Promise<string> {
  const payload = {
    personas: JSON.stringify(profile.personas),
    features: JSON.stringify(profile.features),
    voice: JSON.stringify(profile.voice),
    proof: JSON.stringify(profile.proof),
    competitors: JSON.stringify(profile.competitors),
    brand: JSON.stringify(profile.brand),
    storeUrl: profile.storeUrl.trim() || undefined,
    ctaText: profile.ctaText.trim() || undefined,
  }
  const result = id
    ? await dataClient.models.AppProfile.update({ id, ...payload })
    : await dataClient.models.AppProfile.create({ appId, ...payload })
  if (result.errors?.length) {
    throw new Error(result.errors[0].message)
  }
  if (!result.data) throw new Error('Profile was not saved.')
  return result.data.id
}

function parseRecord(value: unknown): Record<string, unknown> {
  const raw = parseRaw(value ?? null)
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

/**
 * Per-app settings for one reel subtype. Reads `reelConfig[subtype]` and falls
 * back to the older `memeConfig` / `viralConfig` fields.
 */
export async function getSubtypeConfig(
  appId: string,
  subtype: string,
): Promise<Record<string, unknown>> {
  const { data, errors } = await dataClient.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) throw new Error(errors[0].message)
  const row = data[0]
  const reel = parseRecord(row?.reelConfig)
  const own = reel[subtype]
  if (typeof own === 'object' && own !== null) {
    return own as Record<string, unknown>
  }
  if (subtype === 'reel.green-screen') return parseRecord(row?.memeConfig)
  if (subtype === 'reel.tweet-style') return parseRecord(row?.viralConfig)
  return {}
}

export async function saveSubtypeConfig(
  appId: string,
  subtype: string,
  config: object,
): Promise<void> {
  const { data, errors } = await dataClient.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) throw new Error(errors[0].message)
  const row = data[0]
  const reelConfig = JSON.stringify({
    ...parseRecord(row?.reelConfig),
    [subtype]: config,
  })
  const result = row
    ? await dataClient.models.AppProfile.update({ id: row.id, reelConfig })
    : await dataClient.models.AppProfile.create({ appId, reelConfig })
  if (result.errors?.length) throw new Error(result.errors[0].message)
}

export async function getMemeConfig(appId: string): Promise<unknown> {
  return getSubtypeConfig(appId, 'reel.green-screen')
}

export async function saveMemeConfig(
  appId: string,
  config: object,
): Promise<void> {
  return saveSubtypeConfig(appId, 'reel.green-screen', config)
}

/** Per-app viral clip reel configuration. */
export interface ViralConfig {
  blockedVideoIds: string[]
  volume: number
}

export async function getViralConfig(appId: string): Promise<ViralConfig> {
  const record = await getSubtypeConfig(appId, 'reel.tweet-style')
  const volume = Number(record.volume)
  return {
    blockedVideoIds: Array.isArray(record.blockedVideoIds)
      ? record.blockedVideoIds.filter((id): id is string => typeof id === 'string')
      : [],
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1,
  }
}

export async function saveViralConfig(
  appId: string,
  config: ViralConfig,
): Promise<void> {
  return saveSubtypeConfig(appId, 'reel.tweet-style', config)
}
