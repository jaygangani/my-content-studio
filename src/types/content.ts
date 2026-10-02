/**
 * Fonts an overlay can be set in. `geist` ships with the app; the rest are
 * loaded from Google Fonts on demand so the canvas can draw them.
 */
export const OVERLAY_FONTS = [
  { key: 'geist', label: 'Geist', stack: '"Geist Variable", system-ui, sans-serif' },
  { key: 'inter', label: 'Inter', stack: '"Inter", system-ui, sans-serif' },
  { key: 'grotesk', label: 'Grotesk', stack: '"Space Grotesk", system-ui, sans-serif' },
  { key: 'playfair', label: 'Playfair', stack: '"Playfair Display", Georgia, serif' },
  { key: 'instrument', label: 'Instrument', stack: '"Instrument Serif", Georgia, serif' },
  { key: 'anton', label: 'Anton', stack: '"Anton", Impact, sans-serif' },
  { key: 'archivo', label: 'Archivo', stack: '"Archivo", system-ui, sans-serif' },
  { key: 'mono', label: 'Mono', stack: '"JetBrains Mono", ui-monospace, monospace' },
] as const

export type OverlayFontKey = (typeof OVERLAY_FONTS)[number]['key']

export const OVERLAY_FONT_KEYS = OVERLAY_FONTS.map((font) => font.key)

export const OVERLAY_WEIGHTS = [400, 500, 600, 700, 800, 900] as const

export type OverlayWeight = (typeof OVERLAY_WEIGHTS)[number]

/** Text size as a fraction of the output width, so every ratio is 9:16 safe. */
export const OVERLAY_SIZES = [
  { key: 'sm', label: 'S', scale: 0.042 },
  { key: 'md', label: 'M', scale: 0.055 },
  { key: 'lg', label: 'L', scale: 0.072 },
  { key: 'xl', label: 'XL', scale: 0.092 },
] as const

export type OverlaySize = (typeof OVERLAY_SIZES)[number]['key']

export const OVERLAY_SIZE_KEYS = OVERLAY_SIZES.map((size) => size.key)

export const OVERLAY_TRACKING = [
  { key: 'tight', label: 'Tight', em: -0.02 },
  { key: 'normal', label: 'Normal', em: 0 },
  { key: 'wide', label: 'Wide', em: 0.08 },
] as const

export type OverlayTracking = (typeof OVERLAY_TRACKING)[number]['key']

export const OVERLAY_TRACKING_KEYS = OVERLAY_TRACKING.map(
  (tracking) => tracking.key,
)

export const OVERLAY_ALIGNS = ['left', 'center', 'right'] as const

export type OverlayAlign = (typeof OVERLAY_ALIGNS)[number]

export const OVERLAY_BACKDROPS = [
  { key: 'none', label: 'None' },
  { key: 'box', label: 'Box' },
  { key: 'pill', label: 'Pill' },
] as const

export type OverlayBackdrop = (typeof OVERLAY_BACKDROPS)[number]['key']

export const OVERLAY_BACKDROP_KEYS = OVERLAY_BACKDROPS.map(
  (backdrop) => backdrop.key,
)

/** Overlay text colours: the neutral ladder plus two content-only pop accents. */
export const OVERLAY_TEXT_COLORS = [
  { key: 'white', label: 'White', value: '#ffffff' },
  { key: 'bone', label: 'Bone', value: '#f2efe9' },
  { key: 'ash', label: 'Ash', value: '#a3a3a3' },
  { key: 'graphite', label: 'Graphite', value: '#404040' },
  { key: 'ink', label: 'Ink', value: '#030303' },
  { key: 'amber', label: 'Amber', value: '#f59e0b' },
  { key: 'sky', label: 'Sky', value: '#38bdf8' },
] as const

export const OVERLAY_BACKDROP_COLORS = [
  { key: 'ink', label: 'Ink', value: '#030303' },
  { key: 'paper', label: 'Paper', value: '#ffffff' },
  { key: 'amber', label: 'Amber', value: '#f59e0b' },
  { key: 'sky', label: 'Sky', value: '#38bdf8' },
] as const

export const OVERLAY_OPACITIES = [0, 0.25, 0.55, 0.8, 1] as const

export type OverlayTextColor = (typeof OVERLAY_TEXT_COLORS)[number]['value']
export type OverlayBackdropColor =
  (typeof OVERLAY_BACKDROP_COLORS)[number]['value']

/** Per-segment overlay typography and backdrop. Missing keys fall back to the default. */
export interface OverlayTextStyle {
  font: OverlayFontKey
  weight: OverlayWeight
  size: OverlaySize
  tracking: OverlayTracking
  align: OverlayAlign
  uppercase: boolean
  italic: boolean
  text_color: OverlayTextColor
  backdrop: OverlayBackdrop
  backdrop_color: OverlayBackdropColor
  backdrop_opacity: number
}

export const DEFAULT_OVERLAY_STYLE: OverlayTextStyle = {
  font: 'geist',
  weight: 600,
  size: 'md',
  tracking: 'normal',
  align: 'center',
  uppercase: false,
  italic: false,
  text_color: '#ffffff',
  backdrop: 'box',
  backdrop_color: '#030303',
  backdrop_opacity: 0.55,
}

function pickKey<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback
}

function pickHex<T extends { key: string; value: string }>(
  value: unknown,
  allowed: readonly T[],
  fallback: T['value'],
): T['value'] {
  if (typeof value === 'string') {
    const hit = allowed.find(
      (option) => option.value === value.toLowerCase() || option.key === value,
    )
    if (hit) return hit.value
  }
  return fallback
}

/** Coerces a stored (or user-supplied) style object into a valid style. */
export function normalizeOverlayStyle(value: unknown): OverlayTextStyle {
  if (typeof value !== 'object' || value === null) {
    return { ...DEFAULT_OVERLAY_STYLE }
  }
  const raw = value as Record<string, unknown>
  const weight = Number(raw.weight)
  const opacity = Number(raw.backdrop_opacity)
  return {
    font: pickKey(raw.font, OVERLAY_FONT_KEYS, DEFAULT_OVERLAY_STYLE.font),
    weight: (OVERLAY_WEIGHTS as readonly number[]).includes(weight)
      ? (weight as OverlayWeight)
      : DEFAULT_OVERLAY_STYLE.weight,
    size: pickKey(raw.size, OVERLAY_SIZE_KEYS, DEFAULT_OVERLAY_STYLE.size),
    tracking: pickKey(
      raw.tracking,
      OVERLAY_TRACKING_KEYS,
      DEFAULT_OVERLAY_STYLE.tracking,
    ),
    align: pickKey(raw.align, OVERLAY_ALIGNS, DEFAULT_OVERLAY_STYLE.align),
    uppercase:
      typeof raw.uppercase === 'boolean'
        ? raw.uppercase
        : DEFAULT_OVERLAY_STYLE.uppercase,
    italic:
      typeof raw.italic === 'boolean'
        ? raw.italic
        : DEFAULT_OVERLAY_STYLE.italic,
    text_color: pickHex(
      raw.text_color,
      OVERLAY_TEXT_COLORS,
      DEFAULT_OVERLAY_STYLE.text_color,
    ),
    backdrop: pickKey(
      raw.backdrop,
      OVERLAY_BACKDROP_KEYS,
      DEFAULT_OVERLAY_STYLE.backdrop,
    ),
    backdrop_color: pickHex(
      raw.backdrop_color,
      OVERLAY_BACKDROP_COLORS,
      DEFAULT_OVERLAY_STYLE.backdrop_color,
    ),
    backdrop_opacity: Number.isFinite(opacity)
      ? Math.min(1, Math.max(0, Math.round(opacity * 100) / 100))
      : DEFAULT_OVERLAY_STYLE.backdrop_opacity,
  }
}

/** True when the style carries no overrides over `DEFAULT_OVERLAY_STYLE`. */
export function isDefaultOverlayStyle(style: OverlayTextStyle): boolean {
  return (
    JSON.stringify(style) === JSON.stringify(DEFAULT_OVERLAY_STYLE)
  )
}

/** A single overlay text segment keyed to a time range in the video. */
export interface OverlaySegment {
  segment_id: number
  text: string
  start_time_sec: number
  end_time_sec: number
  duration_sec: number
  screen_position: string
  style: OverlayTextStyle
}

function isSegment(value: unknown): value is OverlaySegment {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return typeof record.text === 'string'
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/**
 * Parses the stored `overlayText` value into a sorted list of segments.
 * The field may be a JSON string, an already-parsed object, or null.
 */
export function parseOverlayTimeline(value: unknown): OverlaySegment[] {
  if (value === null || value === undefined) return []

  let parsed: unknown = value
  if (typeof value === 'string') {
    if (!value.trim()) return []
    try {
      parsed = JSON.parse(value)
    } catch {
      return []
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return []
  const list = (parsed as Record<string, unknown>).overlay_text_timeline
  if (!Array.isArray(list)) return []

  return list
    .filter(isSegment)
    .map((segment, index) => {
      const start = toNumber(segment.start_time_sec, 0)
      const duration = toNumber(segment.duration_sec, 0)
      const end = toNumber(segment.end_time_sec, start + duration)
      return {
        segment_id: toNumber(segment.segment_id, index + 1),
        text: segment.text,
        start_time_sec: start,
        end_time_sec: end,
        duration_sec: duration || Math.max(0, end - start),
        screen_position:
          typeof segment.screen_position === 'string'
            ? segment.screen_position
            : 'Center',
        style: normalizeOverlayStyle(segment.style),
      }
    })
    .sort((a, b) => a.start_time_sec - b.start_time_sec)
}

/** Returns the segment active at `timeSec`, or null. */
export function segmentAt(
  segments: OverlaySegment[],
  timeSec: number,
): OverlaySegment | null {
  return (
    segments.find(
      (segment) =>
        timeSec >= segment.start_time_sec && timeSec < segment.end_time_sec,
    ) ?? null
  )
}

/** Audio search hints stored on the content record. */
export interface AudioConfig {
  sound_type?: string
  track_vibe?: string
  mood?: string
  genre?: string
  tempo?: string
  energy?: string
  instruments?: string
  keywords?: string
  [key: string]: unknown
}

const AUDIO_QUERY_KEYS = [
  'sound_type',
  'track_vibe',
  'mood',
  'genre',
  'tempo',
  'energy',
  'instruments',
  'keywords',
] as const

/**
 * Parses the stored `audioConfig` value (JSON string, object, or null) into a
 * normalized config object.
 */
export function parseAudioConfig(value: unknown): AudioConfig {
  if (value === null || value === undefined) return {}

  let parsed: unknown = value
  if (typeof value === 'string') {
    if (!value.trim()) return {}
    try {
      parsed = JSON.parse(value)
    } catch {
      return {}
    }
  }

  if (typeof parsed !== 'object' || parsed === null) return {}

  const record = parsed as Record<string, unknown>
  const config: AudioConfig = {}
  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry === 'string') config[key] = entry
  }
  return config
}

/** Builds the music search query from the config's known hint keys. */
export function audioQuery(config: AudioConfig): string {
  return AUDIO_QUERY_KEYS.map((key) => config[key])
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ')
    .trim()
}
