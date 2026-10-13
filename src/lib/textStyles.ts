import { DEFAULT_OVERLAY_STYLE } from '@/types/content'
import { normalizeOverlayStyle } from '@/types/content'
import type { OverlayTextStyle } from '@/types/content'
import type { TextOverride, TextRole } from '@/types/script'

export type { TextRole }

type StylePatch = Partial<OverlayTextStyle>

export interface TextStylePreset {
  key: string
  label: string
  description: string
  hook: StylePatch
  body: StylePatch
  cta: StylePatch
  hookPosition: string
  bodyPosition: string
  ctaPosition: string
  scrim: number
}

/**
 * Text looks a piece can wear. Every role (hook, body, cta) is a patch over
 * `DEFAULT_OVERLAY_STYLE`; the preview and the exporters resolve them the same
 * way through `resolveTextStyle`.
 */
export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    key: 'clean',
    label: 'Social',
    description: 'Heavy rounded sans, white, soft shadow. Modern Reels look.',
    hook: { font: 'montserrat', weight: 800, size: 'xl', tracking: 'tight', backdrop: 'none', text_color: '#ffffff' },
    body: { font: 'montserrat', weight: 700, size: 'lg', tracking: 'tight', backdrop: 'none', text_color: '#ffffff' },
    cta: { font: 'montserrat', weight: 800, size: 'md', tracking: 'tight', backdrop: 'pill', backdrop_color: '#ffffff', backdrop_opacity: 1, text_color: '#030303' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.3,
  },
  {
    key: 'meme',
    label: 'Classic meme',
    description: 'White condensed capitals with a thick black outline.',
    hook: { font: 'anton', weight: 400, size: 'xl', uppercase: true, backdrop: 'none', text_color: '#ffffff', stroke: 'bold', stroke_color: '#030303' },
    body: { font: 'anton', weight: 400, size: 'lg', uppercase: true, backdrop: 'none', text_color: '#ffffff', stroke: 'bold', stroke_color: '#030303' },
    cta: { font: 'anton', weight: 400, size: 'lg', uppercase: true, backdrop: 'none', text_color: '#ffd60a', stroke: 'bold', stroke_color: '#030303' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.15,
  },
  {
    key: 'sticker',
    label: 'Sticker',
    description: 'Black heavy type on a yellow label. Loud and readable.',
    hook: { font: 'archivoblack', weight: 400, size: 'lg', backdrop: 'box', backdrop_color: '#ffd60a', backdrop_opacity: 1, text_color: '#030303' },
    body: { font: 'archivoblack', weight: 400, size: 'md', backdrop: 'box', backdrop_color: '#ffffff', backdrop_opacity: 1, text_color: '#030303' },
    cta: { font: 'archivoblack', weight: 400, size: 'md', backdrop: 'box', backdrop_color: '#030303', backdrop_opacity: 1, text_color: '#ffd60a' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.1,
  },
  {
    key: 'pop',
    label: 'Pop',
    description: 'Comic capitals in yellow with a black outline.',
    hook: { font: 'bangers', weight: 400, size: 'xl', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffd60a', stroke: 'bold', stroke_color: '#030303' },
    body: { font: 'bangers', weight: 400, size: 'lg', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffffff', stroke: 'bold', stroke_color: '#030303' },
    cta: { font: 'bangers', weight: 400, size: 'lg', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ff4f9a', stroke: 'bold', stroke_color: '#030303' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.15,
  },
  {
    key: 'marker',
    label: 'Marker',
    description: 'Hand-written marker, white with a thin outline.',
    hook: { font: 'marker', weight: 400, size: 'xl', backdrop: 'none', text_color: '#ffffff', stroke: 'thin', stroke_color: '#030303' },
    body: { font: 'marker', weight: 400, size: 'lg', backdrop: 'none', text_color: '#ffffff', stroke: 'thin', stroke_color: '#030303' },
    cta: { font: 'marker', weight: 400, size: 'md', backdrop: 'none', text_color: '#a3e635', stroke: 'thin', stroke_color: '#030303' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.25,
  },
  {
    key: 'editorial',
    label: 'Editorial',
    description: 'Italic serif on a quiet image, magazine feel.',
    hook: { font: 'instrument', weight: 400, size: 'xl', italic: true, backdrop: 'none', text_color: '#f2efe9' },
    body: { font: 'instrument', weight: 400, size: 'lg', backdrop: 'none', text_color: '#f2efe9' },
    cta: { font: 'inter', weight: 600, size: 'sm', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#f2efe9' },
    hookPosition: 'center',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.4,
  },
  {
    key: 'caption',
    label: 'Caption bar',
    description: 'White subtitle bar, left aligned, social style.',
    hook: { font: 'poppins', weight: 700, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    body: { font: 'poppins', weight: 600, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    cta: { font: 'poppins', weight: 700, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#030303', text_color: '#ffffff', backdrop_opacity: 1 },
    hookPosition: 'top left',
    bodyPosition: 'bottom left',
    ctaPosition: 'bottom left',
    scrim: 0.15,
  },
  {
    key: 'poster',
    label: 'Poster',
    description: 'Tall Bebas capitals, wide tracking, yellow accent.',
    hook: { font: 'bebas', weight: 400, size: 'xl', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffd60a' },
    body: { font: 'bebas', weight: 400, size: 'xl', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffffff' },
    cta: { font: 'bebas', weight: 400, size: 'lg', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffd60a' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.45,
  },
]

/** Keys from earlier versions map onto the closest current preset. */
const LEGACY_PRESET_KEYS: Record<string, string> = {
  impact: 'meme',
  highlight: 'sticker',
  typewriter: 'marker',
  whisper: 'clean',
}

export const DEFAULT_TEXT_STYLE = 'clean'

export function getTextStylePreset(key: string | undefined): TextStylePreset {
  const resolved = key ? (LEGACY_PRESET_KEYS[key] ?? key) : key
  return (
    TEXT_STYLE_PRESETS.find((preset) => preset.key === resolved) ??
    TEXT_STYLE_PRESETS[0]
  )
}

type Overrides = Partial<Record<TextRole, TextOverride>> | undefined

export function resolveTextStyle(
  preset: TextStylePreset,
  role: TextRole,
  overrides?: Overrides,
): OverlayTextStyle {
  const {
    position: _position,
    x: _x,
    y: _y,
    ...style
  } = overrides?.[role] ?? {}
  return normalizeOverlayStyle({
    ...DEFAULT_OVERLAY_STYLE,
    ...preset[role],
    ...style,
  })
}

export function resolvePosition(
  preset: TextStylePreset,
  role: TextRole,
  overrides?: Overrides,
): string {
  const fallback =
    role === 'hook'
      ? preset.hookPosition
      : role === 'body'
        ? preset.bodyPosition
        : preset.ctaPosition
  return overrides?.[role]?.position ?? fallback
}

export function presetStyles(
  key: string | undefined,
  overrides?: Overrides,
): OverlayTextStyle[] {
  const preset = getTextStylePreset(key)
  return (['hook', 'body', 'cta'] as const).map((role) =>
    resolveTextStyle(preset, role, overrides),
  )
}

export function resolveAnchor(
  role: TextRole,
  overrides?: Overrides,
): { x: number; y: number } | undefined {
  const override = overrides?.[role]
  if (override && typeof override.x === 'number' && typeof override.y === 'number') {
    return { x: override.x, y: override.y }
  }
  return undefined
}

/** Layers a frame's own tweaks over the piece-wide ones, role by role. */
export function mergeOverrides(
  base: Overrides,
  frame: Overrides,
): Overrides {
  if (!frame) return base
  const out: Partial<Record<TextRole, TextOverride>> = { ...(base ?? {}) }
  for (const role of ['hook', 'body', 'cta'] as const) {
    if (frame[role]) out[role] = { ...(out[role] ?? {}), ...frame[role] }
  }
  return out
}
