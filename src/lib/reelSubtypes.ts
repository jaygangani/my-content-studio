import type { PieceScript } from '@/types/script'

/** Content types that own formats. Only `reel` is subtype-driven for now. */
export const CONTENT_TYPES = [
  { key: 'reel', label: 'Reel', igFormat: 'REEL' },
  { key: 'carousel', label: 'Carousel', igFormat: 'CAROUSEL' },
  { key: 'image', label: 'Single image', igFormat: 'IMAGE' },
  { key: 'story', label: 'Story', igFormat: 'STORY' },
] as const

export type ContentTypeKey = (typeof CONTENT_TYPES)[number]['key']

export type ReelSubtypeKey =
  | 'reel.green-screen'
  | 'reel.tweet-style'
  | 'reel.video-beats'

export interface ReelSubtypeSpec {
  key: ReelSubtypeKey
  /** Name shown in the generate dialog. */
  label: string
  description: string
  /** Not ready for general use: shown in the picker but disabled. */
  beta?: boolean
  /** Stock library category the subtype draws assets from. */
  assetCategory: string | null
  /** What the editor shows for this subtype. */
  controls: {
    background: boolean
    keying: boolean
    headerText: boolean
    beats: boolean
    length: boolean
    sound: boolean
  }
  /** Default system prompt snippet; the format's own template wins. */
  promptKey: string | null
}

/**
 * Fixed registry: each subtype is backed by a pipeline and an editor in code.
 * Admins add formats under a subtype; adding a subtype is a code change.
 */
export const REEL_SUBTYPES: Record<ReelSubtypeKey, ReelSubtypeSpec> = {
  'reel.green-screen': {
    key: 'reel.green-screen',
    label: 'Meme reel',
    description: 'Green screen meme video over a background, with a meme line.',
    assetCategory: 'green-screen',
    controls: {
      background: true,
      keying: true,
      headerText: false,
      beats: false,
      length: true,
      sound: true,
    },
    promptKey: 'reel.green-screen.system',
  },
  'reel.tweet-style': {
    key: 'reel.tweet-style',
    label: 'Tweet-style reel',
    description: 'A tweet-style line on top of a viral video.',
    assetCategory: 'viral-clip',
    controls: {
      background: false,
      keying: false,
      headerText: true,
      beats: false,
      length: false,
      sound: true,
    },
    promptKey: 'reel.tweet-style.system',
  },
  'reel.video-beats': {
    key: 'reel.video-beats',
    label: 'Video reel',
    description: 'Stock video per beat with a text line on each.',
    beta: true,
    assetCategory: null,
    controls: {
      background: false,
      keying: false,
      headerText: false,
      beats: true,
      length: false,
      sound: false,
    },
    promptKey: null,
  },
}

export const REEL_SUBTYPE_KEYS = Object.keys(REEL_SUBTYPES) as ReelSubtypeKey[]

export function isReelSubtype(value: string | null | undefined): value is ReelSubtypeKey {
  return Boolean(value && value in REEL_SUBTYPES)
}

/**
 * Subtype of a piece. Reads `script.subtype`, and falls back to the payload
 * shape for pieces created before subtypes were stored.
 */
export function scriptSubtype(
  script: PieceScript | null | undefined,
): ReelSubtypeKey | null {
  if (!script || script.schema !== 'REEL') return null
  if (isReelSubtype(script.subtype)) return script.subtype
  if (script.payload.meme) return 'reel.green-screen'
  if (script.payload.viral) return 'reel.tweet-style'
  return 'reel.video-beats'
}

/** Maps the legacy `reelKind` values onto subtypes. */
export function subtypeFromReelKind(
  kind: string | null | undefined,
): ReelSubtypeKey | null {
  if (kind === 'meme') return 'reel.green-screen'
  if (kind === 'viral') return 'reel.tweet-style'
  return null
}

/** Subtype of a stored format row, derived for rows written before subtypes. */
export function rowSubtype(row: {
  subtype?: string | null
  kind?: string | null
  igFormat?: string | null
}): string {
  if (row.subtype) return row.subtype
  if (row.kind === 'meme') return 'reel.green-screen'
  if (row.kind === 'viral') return 'reel.tweet-style'
  return row.igFormat === 'REEL' ? 'reel.video-beats' : ''
}
