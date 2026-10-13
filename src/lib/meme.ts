import type { OverlaySegment } from '@/types/content'
import { drawOverlay, groupOffsets } from '@/lib/overlayText'
import {
  getTextStylePreset,
  mergeOverrides,
  resolveAnchor,
  resolvePosition,
  resolveTextStyle,
} from '@/lib/textStyles'
import type { AssetItem } from '@/services/assets'
import type { MemePayload, PieceScript } from '@/types/script'
import { isMemeScript } from '@/types/script'

export const MEME_LOOP_MIN = 5
export const MEME_LOOP_MAX = 30
export const DEFAULT_MEME_BACKGROUND = '#0a0a0a'

/** The single text block as an overlay segment, styled by the hook role. */
export function buildMemeSegments(script: PieceScript): OverlaySegment[] {
  if (!isMemeScript(script)) return []
  const meme = script.payload.meme
  const preset = getTextStylePreset(script.textStyle)
  const overrides = mergeOverrides(script.textOverrides, undefined)
  const style = resolveTextStyle(preset, 'hook', overrides)
  const position = resolvePosition(preset, 'hook', overrides)
  const item = meme.texts[0]
  if (!item?.text.trim()) return []
  return [
    {
      segment_id: 1,
      text: item.text,
      start_time_sec: 0,
      end_time_sec: 0,
      duration_sec: 0,
      screen_position: position,
      anchor: resolveAnchor('hook', overrides),
      maxWidth: item.maxWidth,
      style,
    },
  ]
}

/** Background photo for a meme reel: the stock image asset, when used. */
export function memeBackgroundAsset(
  meme: MemePayload,
  assets: AssetItem[],
): AssetItem | null {
  if (meme.background.mode !== 'stock') return null
  return assets.find((a) => a.type === 'IMAGE') ?? null
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  let sw = width
  let sh = height
  if (source instanceof HTMLImageElement) {
    sw = source.naturalWidth
    sh = source.naturalHeight
  } else if (source instanceof HTMLCanvasElement) {
    sw = source.width
    sh = source.height
  }
  if (!sw || !sh) return
  const scale = Math.max(width / sw, height / sh)
  ctx.drawImage(
    source,
    (width - sw * scale) / 2,
    (height - sh * scale) / 2,
    sw * scale,
    sh * scale,
  )
}

/**
 * Paints the three layers of a meme reel: background, keyed green screen
 * clip, text. Shared by the live preview and the MP4 exporter.
 */
export function paintMeme(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  meme: MemePayload,
  background: HTMLImageElement | null,
  keyed: HTMLCanvasElement | null,
  segments: OverlaySegment[],
) {
  ctx.fillStyle = meme.background.color || DEFAULT_MEME_BACKGROUND
  ctx.fillRect(0, 0, width, height)
  if (background && background.naturalWidth) {
    drawCover(ctx, background, width, height)
  }

  if (keyed && keyed.width && keyed.height) {
    const scale = Math.min(1.5, Math.max(0.3, meme.clip.scale || 1))
    if (meme.clip.position === 'fill') {
      const cover = Math.max(width / keyed.width, height / keyed.height) * scale
      const dw = keyed.width * cover
      const dh = keyed.height * cover
      ctx.drawImage(keyed, (width - dw) / 2, (height - dh) / 2, dw, dh)
    } else {
      const fit = Math.min(width / keyed.width, height / keyed.height) * scale
      const dw = keyed.width * fit
      const dh = keyed.height * fit
      const y =
        meme.clip.position === 'bottom' ? height - dh : (height - dh) / 2
      ctx.drawImage(keyed, (width - dw) / 2, y, dw, dh)
    }
  }

  const offsets = groupOffsets(ctx, segments, width, height)
  for (const item of segments) {
    drawOverlay(ctx, item, width, height, offsets.get(item))
  }
}

/** Per-app meme reel settings. Mirrors `readMemeConfig` in the Lambda. */
export interface MemeConfig {
  background: { mode: 'stock' | 'solid' | 'brand'; color: string }
  loopSeconds: number
  blockedVideoIds: string[]
  clip: { position: 'fill' | 'center' | 'bottom'; scale: number; volume: number }
}

export function defaultMemeConfig(): MemeConfig {
  return {
    background: { mode: 'stock', color: DEFAULT_MEME_BACKGROUND },
    loopSeconds: 10,
    blockedVideoIds: [],
    clip: { position: 'fill', scale: 1, volume: 1 },
  }
}

/** Coerces a stored value into a valid config. */
export function normalizeMemeConfig(value: unknown): MemeConfig {
  const base = defaultMemeConfig()
  if (typeof value !== 'object' || value === null) return base
  const raw = value as Record<string, unknown>
  const bg = (raw.background ?? {}) as Record<string, unknown>
  const clip = (raw.clip ?? {}) as Record<string, unknown>
  const loop = Number(raw.loopSeconds)
  const scale = Number(clip.scale)
  const volume = Number(clip.volume)
  return {
    background: {
      mode: bg.mode === 'solid' || bg.mode === 'brand' ? bg.mode : 'stock',
      color:
        typeof bg.color === 'string' && /^#[0-9a-f]{6}$/i.test(bg.color)
          ? bg.color
          : base.background.color,
    },
    loopSeconds: Number.isFinite(loop)
      ? Math.min(MEME_LOOP_MAX, Math.max(MEME_LOOP_MIN, Math.round(loop)))
      : base.loopSeconds,
    blockedVideoIds: Array.isArray(raw.blockedVideoIds)
      ? raw.blockedVideoIds.filter((id): id is string => typeof id === 'string')
      : [],
    clip: {
      position:
        clip.position === 'center' || clip.position === 'bottom'
          ? clip.position
          : 'fill',
      scale: Number.isFinite(scale) ? Math.min(1.5, Math.max(0.3, scale)) : 1,
      volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : 1,
    },
  }
}
