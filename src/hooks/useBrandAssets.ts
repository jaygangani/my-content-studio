import { useEffect, useState } from 'react'
import { ensureBrandFonts } from '@/lib/brand'
import type { BrandAssets } from '@/lib/carousel'
import { getProfile } from '@/services/profile'
import { getLogoUrl } from '@/services/storage'

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = url
  })
}

async function loadKey(key: string): Promise<HTMLImageElement | null> {
  if (!key) return null
  try {
    return await loadImage(await getLogoUrl(key))
  } catch {
    return null
  }
}

/**
 * Resolves an app's brand kit into drawable assets: logos, feature
 * screenshots and loaded fonts. Returns null until ready or if loading fails.
 */
export function useBrandAssets(
  appId: string | undefined,
  appLogo?: string | null,
): BrandAssets | null {
  const [assets, setAssets] = useState<BrandAssets | null>(null)

  useEffect(() => {
    if (!appId) {
      setAssets(null)
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const { data } = await getProfile(appId)
        const [logoLight, logoDark, appLogoImage] = await Promise.all([
          loadKey(data.brand.logoLight),
          loadKey(data.brand.logoDark),
          loadKey(appLogo ?? ''),
        ])
        const screenshots: Record<string, HTMLImageElement> = {}
        await Promise.all(
          data.features.map(async (feature) => {
            const image = await loadKey(feature.screenshot)
            if (image) screenshots[feature.id] = image
          }),
        )
        await ensureBrandFonts(data.brand)
        if (!cancelled) {
          setAssets({
            brand: data.brand,
            logoLight,
            logoDark,
            appLogo: appLogoImage,
            screenshots,
            features: data.features.map((feature) => ({
              id: feature.id,
              name: feature.name,
            })),
          })
        }
      } catch {
        if (!cancelled) setAssets(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [appId, appLogo])

  return assets
}
