export type PieceSchema = 'REEL' | 'CAROUSEL' | 'IMAGE' | 'STORY'

export interface ReelBeat {
  text: string
  seconds: number
  visual_query: string
}

export type MemeBackgroundMode = 'stock' | 'solid' | 'brand'

export type MemeClipPosition = 'fill' | 'center' | 'bottom'

/** Green screen meme reel: background + keyed stock video + one text block. */
export interface MemePayload {
  videoId: string
  videoKey: string
  videoTitle?: string
  keyColor: string
  loopSeconds: number
  lineOptions: string[]
  texts: Array<{
    text: string
    anchor?: { x: number; y: number }
    maxWidth?: number
  }>
  background: { mode: MemeBackgroundMode; color?: string }
  clip: { position: MemeClipPosition; scale: number; volume: number }
}

export interface ReelPayload {
  hook: string
  beats: ReelBeat[]
  cta: string
  caption: string
  hashtags: string[]
  audio_mood: string
  total_seconds: number
  unified?: boolean
  meme?: MemePayload
}

export type CarouselVisualType =
  | 'typography'
  | 'icon'
  | 'data'
  | 'screenshot'
  | 'stock'

export interface CarouselSlide {
  role: string
  headline: string
  body: string
  visual: string
  visual_type?: CarouselVisualType
  icon?: string
  stat_value?: string
  stat_label?: string
}

export interface CarouselPayload {
  slides: CarouselSlide[]
  caption: string
  hashtags: string[]
}

export interface ImagePayload {
  text_lines: string[]
  visual: string
  caption: string
  hashtags: string[]
}

export interface StoryFrame {
  text: string
  sticker: string
  sticker_text: string
  options: string[]
}

export interface StoryPayload {
  frames: StoryFrame[]
  caption_note: string
}

export type TextRole = 'hook' | 'body' | 'cta'

/** Per-role tweak layered over the chosen text style preset. */
export interface TextOverride {
  font?: string
  weight?: number
  size?: string
  align?: string
  uppercase?: boolean
  italic?: boolean
  text_color?: string
  backdrop?: string
  backdrop_color?: string
  backdrop_opacity?: number
  stroke?: string
  stroke_color?: string
  position?: string
  x?: number
  y?: number
}

interface ScriptBase {
  formatId: number
  formatName: string
  textStyle?: string
  layout?: 'card' | 'grid' | 'columns' | 'stack'
  variant?:
    | 'steps'
    | 'checklist'
    | 'split'
    | 'stat'
    | 'quote'
    | 'tier'
    | 'cards'
    | 'chat'
    | 'level'
    | 'timeline'
    | 'grid'
    | 'flags'
    | 'editorial'
    | 'template'
    | 'poster'
  stockPolicy?: 'never' | 'allowed' | 'preferred'
  bgScheme?: 'dark' | 'light' | 'tinted' | 'bold'
  hookCover?:
    | 'classic'
    | 'centered'
    | 'bigtype'
    | 'framed'
    | 'split'
    | 'badge'
    | 'stripe'
  textOverrides?: Partial<Record<TextRole, TextOverride>>
  /** Per-frame (beat, slide, frame) tweaks keyed by frame index. */
  frameOverrides?: Record<string, Partial<Record<TextRole, TextOverride>>>
}

export type PieceScript =
  | (ScriptBase & { schema: 'REEL'; payload: ReelPayload })
  | (ScriptBase & { schema: 'CAROUSEL'; payload: CarouselPayload })
  | (ScriptBase & { schema: 'IMAGE'; payload: ImagePayload })
  | (ScriptBase & { schema: 'STORY'; payload: StoryPayload })

/** True when the script is a green screen meme reel. */
export function isMemeScript(
  script: PieceScript | null | undefined,
): script is ScriptBase & { schema: 'REEL'; payload: ReelPayload & { meme: MemePayload } } {
  return script?.schema === 'REEL' && Boolean(script.payload.meme)
}

export const REEL_MIN_SECONDS = 15
export const REEL_MAX_SECONDS = 30

const SCHEMAS: readonly string[] = ['REEL', 'CAROUSEL', 'IMAGE', 'STORY']

/** Parses the stored `scriptJson` value (string or object) into a script. */
export function parseScript(value: unknown): PieceScript | null {
  if (value === null || value === undefined) return null
  let parsed: unknown = value
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value)
    } catch {
      return null
    }
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const record = parsed as Record<string, unknown>
  if (typeof record.schema !== 'string' || !SCHEMAS.includes(record.schema)) {
    return null
  }
  if (typeof record.payload !== 'object' || record.payload === null) return null
  const script = record as unknown as PieceScript
  if (script.schema === 'REEL') unifyReel(script.payload)
  return script
}

/**
 * Reels show one line per beat: the first beat is the hook and the last beat
 * is the call to action, so no separate title or CTA overlay stacks on top.
 */
export function unifyReel(payload: ReelPayload): void {
  if (payload.unified || !Array.isArray(payload.beats) || !payload.beats.length) {
    return
  }
  const last = payload.beats.length - 1
  if (payload.hook?.trim()) payload.beats[0].text = payload.hook.trim()
  if (last > 0 && payload.cta?.trim()) payload.beats[last].text = payload.cta.trim()
  payload.hook = payload.beats[0].text
  payload.cta = payload.beats[last].text
  payload.unified = true
}

/** Caption text shown with a piece, whatever its schema. */
export function scriptCaption(script: PieceScript): string {
  return script.schema === 'STORY'
    ? script.payload.caption_note
    : script.payload.caption
}

export function scriptHashtags(script: PieceScript): string[] {
  return script.schema === 'STORY' ? [] : script.payload.hashtags
}
