import { useEffect, useState } from 'react'
import { getLogoUrl } from '@/services/storage'

interface AppLogoProps {
  /** Storage key (S3 path) or absolute URL. Empty renders the placeholder. */
  value: string
  alt: string
  className?: string
}

/**
 * Renders a logo by resolving its stored S3 key to a signed URL.
 * Falls back to the `surface-cool` placeholder block while loading/absent.
 */
export function AppLogo({ value, alt, className }: AppLogoProps) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let active = true

    if (!value) {
      setUrl(null)
      return
    }

    getLogoUrl(value)
      .then((resolved) => {
        if (active) setUrl(resolved)
      })
      .catch(() => {
        if (active) setUrl(null)
      })

    return () => {
      active = false
    }
  }, [value])

  if (!url) {
    return <span aria-hidden="true" className={className} />
  }

  return <img src={url} alt={alt} className={className} />
}