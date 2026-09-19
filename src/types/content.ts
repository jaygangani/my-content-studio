/** A single overlay text segment keyed to a time range in the video. */
export interface OverlaySegment {
  segment_id: number
  text: string
  start_time_sec: number
  end_time_sec: number
  duration_sec: number
  screen_position: string
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
