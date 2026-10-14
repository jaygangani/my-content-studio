import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { canExportMp4 } from '@/lib/export/reel'
import { seekVideo } from '@/lib/export/media'
import {
  AUDIO_CHANNELS,
  AUDIO_RATE,
  encodeAudio,
  renderClipAudio,
} from '@/lib/export/audio'
import { ensureOverlayFonts } from '@/lib/overlayText'
import { pieceStyles, surfaceFor } from '@/lib/render'
import { VIRAL_MAX_SECONDS, buildViralSegment, paintViral } from '@/lib/viral'
import type { PieceScript } from '@/types/script'
import { isViralScript } from '@/types/script'

const FPS = 30
const BITRATE = 6_000_000
const CODEC = 'avc1.640028'

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.addEventListener('loadeddata', () => resolve(video), { once: true })
    video.addEventListener(
      'error',
      () => reject(new Error('Could not load the video for export.')),
      { once: true },
    )
    video.src = url
  })
}

/**
 * Renders a 1080x1920 H.264 MP4 of a viral clip reel in the browser: header
 * text, the clip full width under it, played once (max 30s) with its audio.
 */
export async function exportViralReel(
  script: PieceScript,
  clipUrl: string,
  onProgress: (fraction: number) => void,
): Promise<Blob> {
  if (!isViralScript(script)) throw new Error('Not a viral clip reel.')
  if (!canExportMp4()) {
    throw new Error(
      'MP4 export needs a browser with WebCodecs (Chrome, Edge or Safari 16.4+).',
    )
  }
  const viral = script.payload.viral
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

  await ensureOverlayFonts(pieceStyles(script))
  const video = await loadVideo(clipUrl)
  const actual = Number.isFinite(video.duration) ? video.duration : 0
  const seconds = Math.min(
    VIRAL_MAX_SECONDS,
    Math.max(1, actual || viral.durationSeconds || 10),
  )
  const audio = await renderClipAudio(clipUrl, seconds, viral.clip.volume, false)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas is not available.')

  const target = new ArrayBufferTarget()
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width, height },
    audio: audio
      ? { codec: 'aac', numberOfChannels: AUDIO_CHANNELS, sampleRate: AUDIO_RATE }
      : undefined,
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

  const segment = buildViralSegment(script)
  const totalFrames = Math.round(seconds * FPS)
  for (let k = 0; k < totalFrames; k += 1) {
    if (encodeError) throw encodeError
    await seekVideo(video, Math.min(k / FPS, Math.max(0, actual - 0.05)))
    paintViral(ctx, width, height, viral, video, segment)
    const frame = new VideoFrame(canvas, {
      timestamp: Math.round((k * 1_000_000) / FPS),
      duration: Math.round(1_000_000 / FPS),
    })
    encoder.encode(frame, { keyFrame: k % (FPS * 2) === 0 })
    frame.close()
    while (encoder.encodeQueueSize > 8) {
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    if (k % 15 === 0) {
      onProgress(Math.min(0.95, (k / totalFrames) * (audio ? 0.9 : 0.95)))
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  await encoder.flush()
  encoder.close()
  if (encodeError) throw encodeError
  if (audio) {
    await encodeAudio(audio, (chunk, meta) => muxer.addAudioChunk(chunk, meta))
  }
  muxer.finalize()
  onProgress(1)
  return new Blob([target.buffer], { type: 'video/mp4' })
}
