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
    label: 'Clean',
    description: 'Bold sans, no box, soft shadow. Reads on any clip.',
    hook: { font: 'inter', weight: 800, size: 'xl', tracking: 'tight', backdrop: 'none', text_color: '#ffffff' },
    body: { font: 'inter', weight: 700, size: 'lg', tracking: 'tight', backdrop: 'none', text_color: '#ffffff' },
    cta: { font: 'inter', weight: 700, size: 'md', tracking: 'tight', backdrop: 'pill', backdrop_color: '#ffffff', backdrop_opacity: 1, text_color: '#030303' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.38,
  },
  {
    key: 'impact',
    label: 'Impact',
    description: 'Tall condensed capitals, no box, heavy dim.',
    hook: { font: 'anton', weight: 400, size: 'xl', uppercase: true, tracking: 'wide', backdrop: 'none' },
    body: { font: 'anton', weight: 400, size: 'lg', uppercase: true, tracking: 'wide', backdrop: 'none' },
    cta: { font: 'anton', weight: 400, size: 'md', uppercase: true, tracking: 'wide', backdrop: 'pill', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.45,
  },
  {
    key: 'editorial',
    label: 'Editorial',
    description: 'Italic serif on a quiet image, magazine feel.',
    hook: { font: 'instrument', weight: 400, size: 'xl', italic: true, backdrop: 'none', text_color: '#f2efe9' },
    body: { font: 'instrument', weight: 400, size: 'lg', backdrop: 'none', text_color: '#f2efe9' },
    cta: { font: 'inter', weight: 500, size: 'sm', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#f2efe9' },
    hookPosition: 'center',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.4,
  },
  {
    key: 'highlight',
    label: 'Highlight',
    description: 'Amber marker pills behind bold lines.',
    hook: { font: 'archivo', weight: 800, size: 'lg', backdrop: 'pill', backdrop_color: '#f59e0b', text_color: '#030303', backdrop_opacity: 1 },
    body: { font: 'archivo', weight: 700, size: 'md', backdrop: 'pill', backdrop_color: '#f59e0b', text_color: '#030303', backdrop_opacity: 1 },
    cta: { font: 'archivo', weight: 800, size: 'md', backdrop: 'pill', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.2,
  },
  {
    key: 'caption',
    label: 'Caption bar',
    description: 'White subtitle bar, left aligned, social style.',
    hook: { font: 'inter', weight: 700, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    body: { font: 'inter', weight: 600, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#ffffff', text_color: '#030303', backdrop_opacity: 1 },
    cta: { font: 'inter', weight: 700, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#030303', text_color: '#ffffff', backdrop_opacity: 1 },
    hookPosition: 'top left',
    bodyPosition: 'bottom left',
    ctaPosition: 'bottom left',
    scrim: 0.15,
  },
  {
    key: 'typewriter',
    label: 'Typewriter',
    description: 'Monospace notes on a dark terminal box.',
    hook: { font: 'mono', weight: 700, size: 'md', align: 'left', backdrop: 'box', backdrop_color: '#030303', backdrop_opacity: 0.8, text_color: '#f2efe9' },
    body: { font: 'mono', weight: 500, size: 'sm', align: 'left', backdrop: 'box', backdrop_color: '#030303', backdrop_opacity: 0.8, text_color: '#f2efe9' },
    cta: { font: 'mono', weight: 700, size: 'sm', align: 'left', backdrop: 'box', backdrop_color: '#f59e0b', backdrop_opacity: 1, text_color: '#030303' },
    hookPosition: 'top left',
    bodyPosition: 'center left',
    ctaPosition: 'bottom left',
    scrim: 0.3,
  },
  {
    key: 'poster',
    label: 'Poster',
    description: 'Wide-tracked grotesk capitals in sky blue.',
    hook: { font: 'grotesk', weight: 700, size: 'xl', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#38bdf8' },
    body: { font: 'grotesk', weight: 700, size: 'lg', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#ffffff' },
    cta: { font: 'grotesk', weight: 700, size: 'sm', uppercase: true, tracking: 'wide', backdrop: 'none', text_color: '#38bdf8' },
    hookPosition: 'top',
    bodyPosition: 'center',
    ctaPosition: 'bottom',
    scrim: 0.45,
  },
  {
    key: 'whisper',
    label: 'Whisper',
    description: 'Small, light, lower third. Lets the footage lead.',
    hook: { font: 'inter', weight: 500, size: 'md', backdrop: 'none' },
    body: { font: 'inter', weight: 400, size: 'sm', backdrop: 'none' },
    cta: { font: 'inter', weight: 500, size: 'sm', backdrop: 'none', text_color: '#f2efe9' },
    hookPosition: 'bottom',
    bodyPosition: 'bottom',
    ctaPosition: 'bottom',
    scrim: 0.35,
  },
]

export const DEFAULT_TEXT_STYLE = 'clean'

export function getTextStylePreset(key: string | undefined): TextStylePreset {
  return (
    TEXT_STYLE_PRESETS.find((preset) => preset.key === key) ??
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
