import { getUrl, remove, uploadData } from 'aws-amplify/storage'

const LOGO_PREFIX = 'media/logos/'

/**
 * Uploads a logo image to S3 under `media/logos/` (the authenticated path
 * declared in `amplify/storage/resource.ts`). Returns the storage key that
 * should be persisted on the `Apps.logo` field.
 */
export async function uploadLogo(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${LOGO_PREFIX}${Date.now()}-${safeName}`
  const contentType = file.type || 'application/octet-stream'

  await uploadData({ path, data: file, options: { contentType } }).result
  return path
}

/**
 * Resolves a stored logo key to a time-limited S3 URL.
 * Absolute URLs are returned untouched for backwards compatibility.
 */
export async function getLogoUrl(key: string): Promise<string> {
  if (key.startsWith('http')) return key
  const { url } = await getUrl({ path: key })
  return url.toString()
}

/** Removes a logo object from S3. Ignores absolute URLs. */
export async function deleteLogo(key: string): Promise<void> {
  if (!key || key.startsWith('http')) return
  await remove({ path: key })
}