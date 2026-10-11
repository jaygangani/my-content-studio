import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { loadExportMedia, seekVideo } from '@/lib/export/media'
import {
  buildFrames,
  drawFrame,
  drawTransitionFrame,
  pieceStyles,
  surfaceFor,
  totalSeconds,
  transitionKind,
  transitionLength,
} from '@/lib/render'
import type { Frame } from '@/lib/render'
import { ensureOverlayFonts } from '@/lib/overlayText'
import type { AssetItem } from '@/services/assets'
import type { PieceScript } from '@/types/script'

const FPS = 30
const BITRATE = 6_000_000
const CODEC = 'avc1.640028'

export function canExportMp4(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined'
}

/** Renders a silent 1080x1920 H.264 MP4 entirely in the browser. */
export async function exportReel(
  script: PieceScript,
  assets: AssetItem[],
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  if (!canExportMp4()) {
    throw new Error(
      'MP4 export needs a browser with WebCodecs (Chrome, Edge or Safari 16.4+).',
    )
  }

  const { width, height } = surfaceFor('REEL')
  const config: VideoEncoderConfig = {
    codec: CODEC,
    width,
    height,
    bitrate: BITRATE,
    framerate: FPS,
  }
  const support = await VideoEncoder.isConfigSupported(config)
  if (!support.supported) {
    throw new Error('This browser cannot encode H.264 video at 1080x1920.')
  }

  const frames = buildFrames(script, assets)
  const totalFrames = Math.round(totalSeconds(frames) * FPS)
  await ensureOverlayFonts(pieceStyles(script))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    fastStart: 'in-memory',
  })

  let encodeError: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (error) => {
      encodeError = error
    },
  })
  encoder.configure(config)

  let written = 0
  let previous: { frame: Frame; media: Awaited<ReturnType<typeof loadExportMedia>> | null } | null = null
  for (const [frameIndex, frame] of frames.entries()) {
    const media = frame.media ? await loadExportMedia(frame.media) : null
    const count = Math.max(1, Math.round(frame.seconds * FPS))
    const blendFrames = previous
      ? Math.min(count, Math.round(transitionLength(frame) * FPS))
      : 0
    for (let k = 0; k < count; k += 1) {
      if (encodeError) throw encodeError
      if (media instanceof HTMLVideoElement) await seekVideo(media, k / FPS)
      if (previous && k < blendFrames) {
        if (previous.media instanceof HTMLVideoElement) {
          await seekVideo(previous.media, previous.frame.seconds + k / FPS)
        }
        drawTransitionFrame(
          ctx,
          width,
          height,
          transitionKind(frameIndex),
          (k + 1) / blendFrames,
          { source: previous.media, frame: previous.frame },
          { source: media, frame },
        )
      } else {
        drawFrame(ctx, width, height, media, frame.segments, frame.scrim)
      }
      const videoFrame = new VideoFrame(canvas, {
        timestamp: Math.round((written * 1_000_000) / FPS),
        duration: Math.round(1_000_000 / FPS),
      })
      encoder.encode(videoFrame, { keyFrame: written % (FPS * 2) === 0 })
      videoFrame.close()
      written += 1
      while (encoder.encodeQueueSize > 8) {
        await new Promise((resolve) => setTimeout(resolve, 5))
      }
      if (written % 15 === 0) {
        onProgress(Math.min(1, written / totalFrames))
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
    previous = { frame, media }
  }

  await encoder.flush()
  encoder.close()
  if (encodeError) throw encodeError
  muxer.finalize()
  onProgress(1)
  return new Blob([target.buffer], { type: 'video/mp4' })
}
