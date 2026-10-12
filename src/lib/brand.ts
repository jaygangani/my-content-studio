import type { Brand, LogoCorner, VisualStyle } from '@/types/profile'

export interface BrandFont {
  key: string
  label: string
  family: string
  stack: string
  weights: number[]
  serif: boolean
}

/** Approved brand fonts. Every family is loaded by `ensureOverlayFontCss`. */
export const BRAND_FONTS: BrandFont[] = [
  { key: 'inter', label: 'Inter', family: 'Inter', stack: '"Inter", system-ui, sans-serif', weights: [400, 500, 600, 700, 800, 900], serif: false },
  { key: 'dm-sans', label: 'DM Sans', family: 'DM Sans', stack: '"DM Sans", system-ui, sans-serif', weights: [400, 500, 700], serif: false },
  { key: 'poppins', label: 'Poppins', family: 'Poppins', stack: '"Poppins", system-ui, sans-serif', weights: [400, 500, 600, 700, 800], serif: false },
  { key: 'montserrat', label: 'Montserrat', family: 'Montserrat', stack: '"Montserrat", system-ui, sans-serif', weights: [400, 600, 700, 800, 900], serif: false },
  { key: 'manrope', label: 'Manrope', family: 'Manrope', stack: '"Manrope", system-ui, sans-serif', weights: [400, 600, 700, 800], serif: false },
  { key: 'work-sans', label: 'Work Sans', family: 'Work Sans', stack: '"Work Sans", system-ui, sans-serif', weights: [400, 600, 700], serif: false },
  { key: 'grotesk', label: 'Space Grotesk', family: 'Space Grotesk', stack: '"Space Grotesk", system-ui, sans-serif', weights: [400, 500, 600, 700], serif: false },
  { key: 'archivo', label: 'Archivo', family: 'Archivo', stack: '"Archivo", system-ui, sans-serif', weights: [400, 500, 600, 700, 800, 900], serif: false },
  { key: 'playfair', label: 'Playfair Display', family: 'Playfair Display', stack: '"Playfair Display", Georgia, serif', weights: [400, 500, 600, 700, 800, 900], serif: true },
  { key: 'lora', label: 'Lora', family: 'Lora', stack: '"Lora", Georgia, serif', weights: [400, 600, 700], serif: true },
  { key: 'fraunces', label: 'Fraunces', family: 'Fraunces', stack: '"Fraunces", Georgia, serif', weights: [400, 600, 700, 900], serif: true },
  { key: 'mono', label: 'JetBrains Mono', family: 'JetBrains Mono', stack: '"JetBrains Mono", ui-monospace, monospace', weights: [400, 500, 700], serif: false },
]

export function getBrandFont(key: string): BrandFont {
  return BRAND_FONTS.find((font) => font.key === key) ?? BRAND_FONTS[0]
}

export interface VisualStyleSpec {
  key: VisualStyle
  label: string
  summary: string
  rules: [string, string, string]
}

export const VISUAL_STYLES: VisualStyleSpec[] = [
  {
    key: 'bold-minimal',
    label: 'Bold and minimal',
    summary: 'Dark slides, heavy headlines, one accent per slide.',
    rules: [
      'Dark background on every slide.',
      'One accent colour per slide, never more.',
      'Heavy sans headlines, no more than 2 fonts.',
    ],
  },
  {
    key: 'warm-editorial',
    label: 'Warm and editorial',
    summary: 'Light warm slides, serif headlines, calm spacing.',
    rules: [
      'Light background, dark text.',
      'Serif headline, simple sans body.',
      'Accent only as a thin rule or number.',
    ],
  },
  {
    key: 'tech-clean',
    label: 'Tech and clean',
    summary: 'Precise grid, small caps labels, mono details.',
    rules: [
      'Near-black or white background, no decoration.',
      'Small uppercase labels with a monospace accent.',
      'Left-aligned text on a visible grid.',
    ],
  },
]

export function getVisualStyle(key: string | undefined): VisualStyleSpec {
  return VISUAL_STYLES.find((style) => style.key === key) ?? VISUAL_STYLES[0]
}

export const LOGO_CORNERS: Array<{ key: LogoCorner; label: string }> = [
  { key: 'top-left', label: 'Top left' },
  { key: 'top-right', label: 'Top right' },
  { key: 'bottom-left', label: 'Bottom left' },
  { key: 'bottom-right', label: 'Bottom right' },
]

const HEX = /^#[0-9a-f]{6}$/i

export function isHexColor(value: string | undefined): boolean {
  return Boolean(value && HEX.test(value.trim()))
}

export function emptyBrand(): Brand {
  return {
    colors: { primary: '', secondary: '', accent: '' },
    headlineFont: '',
    bodyFont: '',
    logoLight: '',
    logoDark: '',
    logoCorner: 'top-left',
    showLogo: true,
    visualStyle: 'bold-minimal',
  }
}

function findFontKey(value: unknown): string {
  if (typeof value !== 'string') return ''
  const lower = value.trim().toLowerCase()
  const match = BRAND_FONTS.find(
    (font) =>
      font.key === lower ||
      font.label.toLowerCase() === lower ||
      font.family.toLowerCase() === lower,
  )
  return match?.key ?? ''
}

/** Reads stored brand JSON, migrating the old `{primaryColors, font}` shape. */
export function normalizeBrand(raw: unknown): Brand {
  const base = emptyBrand()
  if (!raw || typeof raw !== 'object') return base
  const input = raw as Record<string, unknown>
  const out: Brand = { ...base }

  const colors = input.colors
  if (colors && typeof colors === 'object') {
    const c = colors as Record<string, unknown>
    for (const key of ['primary', 'secondary', 'accent'] as const) {
      if (typeof c[key] === 'string') out.colors[key] = c[key] as string
    }
  } else if (typeof input.primaryColors === 'string') {
    const hexes = input.primaryColors.match(/#[0-9a-fA-F]{6}/g) ?? []
    out.colors = {
      primary: hexes[0] ?? '',
      secondary: hexes[1] ?? '',
      accent: hexes[2] ?? '',
    }
  }

  out.headlineFont = findFontKey(input.headlineFont) || findFontKey(input.font)
  out.bodyFont = findFontKey(input.bodyFont)
  for (const key of ['logoLight', 'logoDark'] as const) {
    if (typeof input[key] === 'string') out[key] = input[key] as string
  }
  if (typeof input.logoCorner === 'string') {
    const corner = LOGO_CORNERS.find((item) => item.key === input.logoCorner)
    if (corner) out.logoCorner = corner.key
  }
  if (typeof input.showLogo === 'boolean') out.showLogo = input.showLogo
  if (typeof input.visualStyle === 'string') {
    out.visualStyle = getVisualStyle(input.visualStyle).key
  }
  return out
}

/** Names the missing pieces of the brand kit. The logo is optional. */
export function getMissingBrandFields(
  brand: Brand,
  _appLogo?: string | null,
): string[] {
  const missing: string[] = []
  if (!isHexColor(brand.colors.primary)) missing.push('primary colour')
  if (!isHexColor(brand.colors.secondary)) missing.push('secondary colour')
  if (!isHexColor(brand.colors.accent)) missing.push('accent colour')
  if (!brand.headlineFont) missing.push('headline font')
  if (!brand.bodyFont) missing.push('body font')
  return missing
}

export function isBrandComplete(brand: Brand, appLogo?: string | null): boolean {
  return getMissingBrandFields(brand, appLogo).length === 0
}

/** Loads the brand fonts (headline and body) before any canvas draw. */
export async function ensureBrandFonts(brand: Brand): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  const { ensureOverlayFontCss } = await import('@/lib/overlayText')
  await ensureOverlayFontCss()
  const keys = [...new Set([brand.headlineFont, brand.bodyFont].filter(Boolean))]
  const loads: Promise<unknown>[] = []
  for (const key of keys) {
    const font = getBrandFont(key)
    for (const weight of font.weights) {
      loads.push(
        document.fonts.load(`${weight} 48px "${font.family}"`).catch(() => []),
      )
    }
  }
  await Promise.all(loads)
  await document.fonts.ready
}
