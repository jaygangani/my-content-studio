import type { OverlaySegment } from '@/types/content'
import { drawOverlay, overlayBox } from '@/lib/overlayText'
import {
  getTextStylePreset,
  mergeOverrides,
  resolveTextStyle,
} from '@/lib/textStyles'
import type { PieceScript, ViralPayload } from '@/types/script'
import { isViralScript } from '@/types/script'

export const VIRAL_MAX_SECONDS = 30
export const DEFAULT_VIRAL_HEADER = '#000000'

const MIN_HEADER = 0.2
const HEADER_PAD = 0.035

/** The header text as an overlay segment, centred, no box. */
export function buildViralSegment(script: PieceScript): OverlaySegment | null {
  if (!isViralScript(script)) return null
  const item = script.payload.viral.texts[0]
  if (!item?.text.trim()) return null
  const preset = getTextStylePreset(script.textStyle)
  const overrides = mergeOverrides(script.textOverrides, undefined)
  const style = resolveTextStyle(preset, 'hook', overrides)
  return {
    segment_id: 1,
    text: item.text,
    start_time_sec: 0,
    end_time_sec: 0,
    duration_sec: 0,
    screen_position: 'center',
    maxWidth: item.maxWidth ?? 0.86,
    style: { ...style, backdrop: 'none', align: 'center' },
  }
}

/** Height of the header in pixels for the given text block. */
function headerHeight(
  ctx: CanvasRenderingContext2D,
  segment: OverlaySegment | null,
  width: number,
  height: number,
): number {
  const minimum = Math.round(height * MIN_HEADER)
  if (!segment) return minimum
  const box = overlayBox(ctx, { ...segment, anchor: { x: 0.5, y: 0.5 } }, width, height)
  return Math.max(minimum, Math.round(box.height + height * HEADER_PAD * 2))
}

/**
 * Paints a viral clip reel frame: header with the text, the clip full width
 * right under it, black elsewhere. Shared by the preview and the exporter.
 */
export function paintViral(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  viral: ViralPayload,
  video: CanvasImageSource | null,
  segment: OverlaySegment | null,
) {
  ctx.fillStyle = DEFAULT_VIRAL_HEADER
  ctx.fillRect(0, 0, width, height)
  const header = headerHeight(ctx, segment, width, height)
  ctx.fillStyle = viral.header?.background || DEFAULT_VIRAL_HEADER
  ctx.fillRect(0, 0, width, header)

  if (video) {
    const el = video as HTMLVideoElement
    const sw = el.videoWidth || width
    const sh = el.videoHeight || height
    if (sw && sh) {
      const scale = Math.min(width / sw, (height - header) / sh)
      const dw = sw * scale
      const dh = sh * scale
      ctx.drawImage(video, (width - dw) / 2, header, dw, dh)
    }
  }

  if (segment) {
    drawOverlay(ctx, {
      ...segment,
      anchor: { x: 0.5, y: header / 2 / height },
    }, width, height)
  }
}
