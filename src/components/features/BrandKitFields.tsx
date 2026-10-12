import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import {
  BRAND_FONTS,
  LOGO_CORNERS,
  VISUAL_STYLES,
  getMissingBrandFields,
  isHexColor,
} from '@/lib/brand'
import { cn } from '@/lib/utils'
import { getLogoUrl, uploadMedia } from '@/services/storage'
import type { MediaFolder } from '@/services/storage'
import type { Brand, LogoCorner, VisualStyle } from '@/types/profile'

interface BrandKitFieldsProps {
  brand: Brand
  appLogo?: string | null
  onChange: (brand: Brand) => void
}

const COLOR_FIELDS = [
  { key: 'primary', label: 'Primary colour' },
  { key: 'secondary', label: 'Secondary colour' },
  { key: 'accent', label: 'Accent colour' },
] as const

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const valid = isHexColor(value)
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="size-11 shrink-0 cursor-pointer rounded-md border border-hairline-strong bg-surface-card p-1"
        />
        <input
          value={value}
          placeholder="#112233"
          onChange={(e) => onChange(e.target.value.trim())}
          className={cn(
            'h-11 w-full min-w-0 rounded-md border bg-surface-card px-3 text-sm',
            value && !valid ? 'border-destructive' : 'border-hairline-strong',
          )}
        />
      </div>
    </div>
  )
}

export function ImageUpload({
  label,
  value,
  onChange,
  darkPreview,
  folder = 'brand',
}: {
  label: string
  value: string
  onChange: (key: string) => void
  darkPreview?: boolean
  folder?: MediaFolder
}) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!value) {
      setUrl(null)
      return
    }
    void getLogoUrl(value)
      .then((next) => {
        if (!cancelled) setUrl(next)
      })
      .catch(() => {
        if (!cancelled) setUrl(null)
      })
    return () => {
      cancelled = true
    }
  }, [value])

  const handleFile = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadMedia(file, folder))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex size-16 items-center justify-center overflow-hidden rounded-lg border border-hairline-strong',
            darkPreview ? 'bg-ink' : 'bg-white',
          )}
        >
          {url ? (
            <img src={url} alt={label} className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[11px] text-stone">None</span>
          )}
        </div>
        <label className="flex h-10 cursor-pointer items-center rounded-full border border-hairline-strong px-4 text-sm text-ink hover:bg-muted">
          {busy ? 'Uploading…' : value ? 'Replace' : 'Upload'}
          <input
            type="file"
            accept="image/png,image/svg+xml,image/jpeg,image/webp"
            className="hidden"
            disabled={busy}
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-sm text-graphite hover:text-ink"
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <span className="text-[13px] text-ink">{error}</span> : null}
    </div>
  )
}

/** Brand kit: colours, two fonts, logo variants, placement and visual style. */
export function BrandKitFields({ brand, appLogo, onChange }: BrandKitFieldsProps) {
  const missing = getMissingBrandFields(brand, appLogo)
  const patch = (change: Partial<Brand>) => onChange({ ...brand, ...change })

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-medium text-ink">Brand kit</h3>
        <p className="mt-1 text-[13px] leading-tight tracking-[-0.26px] text-stone">
          Carousels use this kit only. Without it, carousel formats are not
          generated.
        </p>
        {missing.length ? (
          <p className="mt-3 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
            Missing: {missing.join(', ')}.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {COLOR_FIELDS.map((field) => (
          <ColorField
            key={field.key}
            label={field.label}
            value={brand.colors[field.key]}
            onChange={(value) =>
              patch({ colors: { ...brand.colors, [field.key]: value } })
            }
          />
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            ['headlineFont', 'Headline font'],
            ['bodyFont', 'Body font'],
          ] as const
        ).map(([key, label]) => (
          <div key={key} className="flex flex-col gap-2">
            <Label htmlFor={`brand-${key}`}>{label}</Label>
            <select
              id={`brand-${key}`}
              value={brand[key]}
              onChange={(e) => patch({ [key]: e.target.value })}
              className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink"
            >
              <option value="">Choose a font</option>
              {BRAND_FONTS.map((font) => (
                <option key={font.key} value={font.key}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImageUpload
          label="Logo for light backgrounds (optional)"
          value={brand.logoLight}
          onChange={(logoLight) => patch({ logoLight })}
        />
        <ImageUpload
          label="Logo for dark backgrounds (optional)"
          value={brand.logoDark}
          darkPreview
          onChange={(logoDark) => patch({ logoDark })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-3 pt-7 text-sm text-ink sm:order-last">
          <input
            type="checkbox"
            checked={brand.showLogo}
            onChange={(e) => patch({ showLogo: e.target.checked })}
            className="size-4 accent-primary"
          />
          Show the logo on slides
        </label>
        <div className="flex flex-col gap-2">
          <Label htmlFor="brand-corner">Logo corner</Label>
          <select
            id="brand-corner"
            value={brand.logoCorner}
            onChange={(e) => patch({ logoCorner: e.target.value as LogoCorner })}
            className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink"
          >
            {LOGO_CORNERS.map((corner) => (
              <option key={corner.key} value={corner.key}>
                {corner.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <Label>Visual style</Label>
        <div className="grid gap-3 sm:grid-cols-3">
          {VISUAL_STYLES.map((style) => {
            const selected = brand.visualStyle === style.key
            return (
              <button
                key={style.key}
                type="button"
                aria-pressed={selected}
                onClick={() => patch({ visualStyle: style.key as VisualStyle })}
                className={cn(
                  'flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors',
                  selected
                    ? 'border-ink bg-muted'
                    : 'border-hairline-strong hover:bg-muted',
                )}
              >
                <span className="text-sm font-medium text-ink">{style.label}</span>
                <span className="text-[13px] leading-snug text-graphite">
                  {style.summary}
                </span>
                <ul className="list-disc pl-4 text-[12px] leading-snug text-stone">
                  {style.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
