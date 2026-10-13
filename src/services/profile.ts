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

/** Per-app meme reel configuration stored on the profile record. */
export async function getMemeConfig(appId: string): Promise<unknown> {
  const { data, errors } = await dataClient.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) throw new Error(errors[0].message)
  return parseRaw(data[0]?.memeConfig ?? null)
}

export async function saveMemeConfig(
  appId: string,
  config: object,
): Promise<void> {
  const { data, errors } = await dataClient.models.AppProfile.list({
    filter: { appId: { eq: appId } },
  })
  if (errors?.length) throw new Error(errors[0].message)
  const memeConfig = JSON.stringify(config)
  const row = data[0]
  const result = row
    ? await dataClient.models.AppProfile.update({ id: row.id, memeConfig })
    : await dataClient.models.AppProfile.create({ appId, memeConfig })
  if (result.errors?.length) throw new Error(result.errors[0].message)
}
