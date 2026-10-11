import type { OverlaySegment, OverlayTextStyle } from '@/types/content'
import {
  getTextStylePreset,
  mergeOverrides,
  presetStyles,
  resolveAnchor,
  resolvePosition,
  resolveTextStyle,
} from '@/lib/textStyles'
import type { AssetItem } from '@/services/assets'
import type { PieceScript, PieceSchema } from '@/types/script'
import { drawOverlay, groupOffsets } from '@/lib/overlayText'

export interface FrameMedia {
  url: string
  type: 'VIDEO' | 'IMAGE'
}

/** One drawable step: a reel beat, a carousel slide, or a story frame. */
export interface Frame {
  id: string
  seconds: number
  media: FrameMedia | null
  segments: OverlaySegment[]
  scrim: number
}

export interface Surface {
  width: number
  height: number
}

const SURFACES: Record<PieceSchema, Surface> = {
  REEL: { width: 1080, height: 1920 },
  STORY: { width: 1080, height: 1920 },
  CAROUSEL: { width: 1080, height: 1350 },
  IMAGE: { width: 1080, height: 1350 },
}

const SOLID_BACKGROUND = '#0a0a0a'
const STILL_SECONDS = 4

export function surfaceFor(schema: PieceSchema): Surface {
  return SURFACES[schema]
}

function segment(
  id: number,
  text: string,
  position: string,
  style: OverlayTextStyle,
  anchor?: { x: number; y: number },
): OverlaySegment {
  return {
    anchor,
    segment_id: id,
    text,
    start_time_sec: 0,
    end_time_sec: 0,
    duration_sec: 0,
    screen_position: position,
    style,
  }
}

function mediaFor(assets: AssetItem[], beatIndex: number): FrameMedia | null {
  const asset = assets.find((a) => a.beatIndex === beatIndex)
  if (!asset || !asset.type) return null
  return { url: asset.url, type: asset.type }
}

function compact(segments: OverlaySegment[]): OverlaySegment[] {
  return segments.filter((s) => s.text.trim())
}

export function buildFrames(script: PieceScript, assets: AssetItem[]): Frame[] {
  const preset = getTextStylePreset(script.textStyle)
  const forFrame = (index: number) => {
    const overrides = mergeOverrides(
      script.textOverrides,
      script.frameOverrides?.[String(index)],
    )
    return {
      hook: resolveTextStyle(preset, 'hook', overrides),
      body: resolveTextStyle(preset, 'body', overrides),
      cta: resolveTextStyle(preset, 'cta', overrides),
      hookPosition: resolvePosition(preset, 'hook', overrides),
      bodyPosition: resolvePosition(preset, 'body', overrides),
      ctaPosition: resolvePosition(preset, 'cta', overrides),
      hookAnchor: resolveAnchor('hook', overrides),
      bodyAnchor: resolveAnchor('body', overrides),
      ctaAnchor: resolveAnchor('cta', overrides),
    }
  }
  const {
    hook,
    body,
    bodyPosition,
    hookAnchor,
  } = forFrame(0)
  const { scrim } = preset

  switch (script.schema) {
    case 'REEL': {
      const { beats } = script.payload
      return beats.map((beat, index) => {
        const f = forFrame(index)
        const first = index === 0
        const last = index === beats.length - 1 && beats.length > 1
        const line = first
          ? segment(1, beat.text, f.hookPosition, f.hook, f.hookAnchor)
          : last
            ? segment(3, beat.text, f.ctaPosition, f.cta, f.ctaAnchor)
            : segment(2, beat.text, f.bodyPosition, f.body, f.bodyAnchor)
        const segments = [line]
        return {
          id: `beat-${index}`,
          seconds: beat.seconds,
          media: mediaFor(assets, index),
          segments: compact(segments),
          scrim,
        }
      })
    }
    case 'CAROUSEL':
      return script.payload.slides.map((slide, index) => {
        const f = forFrame(index)
        return {
          id: `slide-${index}`,
          seconds: STILL_SECONDS,
          media: mediaFor(assets, index),
          segments: compact([
            segment(1, slide.headline, f.hookPosition, f.hook, f.hookAnchor),
            segment(2, slide.body, f.hookPosition, f.body, f.bodyAnchor),
          ]).map((item) =>
            item.segment_id === 2 && f.bodyAnchor
              ? item
              : { ...item, group: `slide-${index}` },
          ),
          scrim,
        }
      })
    case 'IMAGE': {
      const lines = script.payload.text_lines.filter((line) => line.trim())
      const cell = (size: OverlayTextStyle['size']): OverlayTextStyle => ({
        ...body,
        size,
        align: 'center',
        backdrop: 'box',
        backdrop_color: '#030303',
        backdrop_opacity: 0.72,
        text_color: '#ffffff',
      })
      let segments: OverlaySegment[]

      if (script.layout === 'grid' && lines.length > 1) {
        const rows = Math.ceil(lines.length / 3)
        segments = lines.slice(0, 9).map((line, index) => {
          const column = index % 3
          const row = Math.floor(index / 3)
          const y = rows === 1 ? 0.5 : 0.24 + (row * 0.52) / (rows - 1)
          const item = segment(index + 1, line, 'center', cell('sm'), {
            x: (column + 0.5) / 3,
            y,
          })
          item.maxWidth = 0.27
          return item
        })
      } else if (script.layout === 'columns' && lines.length > 0) {
        const light: OverlayTextStyle = {
          ...cell('sm'),
          backdrop_color: '#ffffff',
          text_color: '#030303',
          backdrop_opacity: 1,
        }
        segments = lines.flatMap((line, index) => {
          const [left, right = ''] = line.split('||').map((part) => part.trim())
          const y = lines.length === 1 ? 0.5 : 0.24 + (index * 0.52) / (lines.length - 1)
          const l = segment(index * 2 + 1, left, 'center', cell('sm'), { x: 0.27, y })
          const r = segment(index * 2 + 2, right, 'center', light, { x: 0.73, y })
          l.maxWidth = 0.42
          r.maxWidth = 0.42
          return [l, r]
        })
      } else if (script.layout === 'stack' && lines.length > 1) {
        segments = lines.map((line, index) => {
          const y = 0.22 + (index * 0.56) / (lines.length - 1)
          const item = segment(index + 1, line, 'center', cell('md'), { x: 0.5, y })
          item.maxWidth = 0.82
          return item
        })
      } else {
        segments = [
          segment(1, lines.join(' '), bodyPosition, hook, hookAnchor),
        ]
      }

      return [
        {
          id: 'image',
          seconds: STILL_SECONDS,
          media: mediaFor(assets, 0),
          segments: compact(segments),
          scrim,
        },
      ]
    }
    case 'STORY':
      return script.payload.frames.map((frame, index) => {
        const f = forFrame(index)
        return {
          id: `frame-${index}`,
          seconds: STILL_SECONDS,
          media: null,
          segments: compact([
            segment(1, frame.text, f.bodyPosition, f.hook, f.hookAnchor),
          ]),
          scrim,
        }
      })
  }
}

export function totalSeconds(frames: Frame[]): number {
  return frames.reduce((sum, frame) => sum + frame.seconds, 0)
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  let sw = width
  let sh = height
  if (source instanceof HTMLVideoElement) {
    sw = source.videoWidth
    sh = source.videoHeight
  } else if (source instanceof HTMLImageElement) {
    sw = source.naturalWidth
    sh = source.naturalHeight
  }
  if (!sw || !sh) return
  const scale = Math.max(width / sw, height / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh)
}

/** Paints one frame. Shared by the live preview and the exporters. */
export function drawFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  source: CanvasImageSource | null,
  segments: OverlaySegment[],
  scrim = 0.25,
) {
  ctx.fillStyle = SOLID_BACKGROUND
  ctx.fillRect(0, 0, width, height)
  if (source) {
    drawCover(ctx, source, width, height)
    ctx.fillStyle = `rgba(0, 0, 0, ${scrim})`
    ctx.fillRect(0, 0, width, height)
  }
  const offsets = groupOffsets(ctx, segments, width, height)
  for (const item of segments) {
    drawOverlay(ctx, item, width, height, offsets.get(item))
  }
}

export function pieceStyles(script?: PieceScript): OverlayTextStyle[] {
  const styles = presetStyles(script?.textStyle, script?.textOverrides)
  for (const frame of Object.values(script?.frameOverrides ?? {})) {
    styles.push(
      ...presetStyles(
        script?.textStyle,
        mergeOverrides(script?.textOverrides, frame),
      ),
    )
  }
  return styles
}

export type TransitionKind = 'fade' | 'slide' | 'zoom' | 'wipe'

const TRANSITION_CYCLE: TransitionKind[] = ['slide', 'zoom', 'wipe', 'fade']

export const TRANSITION_SECONDS = 0.5

/** Transition into the frame at `index`. Cycles so neighbouring cuts differ. */
export function transitionKind(index: number): TransitionKind {
  return TRANSITION_CYCLE[Math.max(0, index - 1) % TRANSITION_CYCLE.length]
}

/** How long the incoming frame blends over the outgoing one. */
export function transitionLength(incoming: Frame): number {
  return Math.min(TRANSITION_SECONDS, Math.max(0.1, incoming.seconds / 2))
}

function ease(p: number): number {
  const t = Math.min(1, Math.max(0, p))
  return t * t * (3 - 2 * t)
}

interface TransitionSide {
  source: CanvasImageSource | null
  frame: Frame
}

/**
 * Paints the blend between two reel beats at progress `p` (0 to 1). Shared by
 * the live preview and the MP4 exporter so both show the same motion.
 */
export function drawTransitionFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  kind: TransitionKind,
  p: number,
  outgoing: TransitionSide,
  incoming: TransitionSide,
) {
  const t = ease(p)
  const paint = (side: TransitionSide) =>
    drawFrame(
      ctx,
      width,
      height,
      side.source,
      side.frame.segments,
      side.frame.scrim,
    )

  if (kind === 'slide') {
    ctx.save()
    ctx.translate(-t * width, 0)
    paint(outgoing)
    ctx.restore()
    ctx.save()
    ctx.translate((1 - t) * width, 0)
    paint(incoming)
    ctx.restore()
    return
  }

  if (kind === 'zoom') {
    ctx.save()
    ctx.translate(width / 2, height / 2)
    const out = 1 + 0.18 * t
    ctx.scale(out, out)
    ctx.translate(-width / 2, -height / 2)
    paint(outgoing)
    ctx.restore()
    ctx.save()
    ctx.globalAlpha = t
    ctx.translate(width / 2, height / 2)
    const inn = 1.15 - 0.15 * t
    ctx.scale(inn, inn)
    ctx.translate(-width / 2, -height / 2)
    paint(incoming)
    ctx.restore()
    return
  }

  if (kind === 'wipe') {
    paint(outgoing)
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, width * t, height)
    ctx.clip()
    paint(incoming)
    ctx.restore()
    return
  }

  paint(outgoing)
  ctx.save()
  ctx.globalAlpha = t
  paint(incoming)
  ctx.restore()
}
