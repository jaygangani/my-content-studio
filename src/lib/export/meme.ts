import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import { createKeyer } from '@/lib/chromaKey'
import { buildMemeSegments, paintMeme } from '@/lib/meme'
import { ensureOverlayFonts } from '@/lib/overlayText'
import { pieceStyles, surfaceFor } from '@/lib/render'
import type { PieceScript } from '@/types/script'
import { isMemeScript } from '@/types/script'
import { canExportMp4 } from '@/lib/export/reel'
import { seekVideo } from '@/lib/export/media'
import {
  AUDIO_CHANNELS,
  AUDIO_RATE,
  encodeAudio,
  renderClipAudio,
} from '@/lib/export/audio'

const FPS = 30
const BITRATE = 6_000_000
const CODEC = 'avc1.640028'
const KEY_MAX_SIDE = 1280

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
      () => reject(new Error('Could not load the green screen video for export.')),
      { once: true },
    )
    video.src = url
  })
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.addEventListener('load', () => resolve(image), { once: true })
    image.addEventListener(
      'error',
      () => reject(new Error('Could not load the background photo for export.')),
      { once: true },
    )
    image.src = url
  })
}

export interface MemeExportResult {
  blob: Blob
  /** False when the clip audio was left out (none, muted or no AAC support). */
  withAudio: boolean
}

/**
 * Renders a 1080x1920 H.264 MP4 of a meme reel in the browser: background,
 * keyed clip looped to `loopSeconds`, text, and the clip's audio.
 */
export async function exportMemeReel(
  script: PieceScript,
  clipUrl: string,
  backgroundUrl: string | null,
  onProgress: (fraction: number) => void,
): Promise<MemeExportResult> {
  if (!isMemeScript(script)) throw new Error('Not a meme reel.')
  if (!canExportMp4()) {
    throw new Error(
      'MP4 export needs a browser with WebCodecs (Chrome, Edge or Safari 16.4+).',
    )
  }
  const meme = script.payload.meme
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
  const [video, background] = await Promise.all([
    loadVideo(clipUrl),
    backgroundUrl ? loadImage(backgroundUrl) : Promise.resolve(null),
  ])
  const seconds = Math.min(30, Math.max(1, meme.loopSeconds))
  const audio = await renderClipAudio(clipUrl, seconds, meme.clip.volume, true)

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

  const keyer = createKeyer(meme.keyColor, KEY_MAX_SIDE)
  const segments = buildMemeSegments(script)
  const totalFrames = Math.round(seconds * FPS)

  for (let k = 0; k < totalFrames; k += 1) {
    if (encodeError) throw encodeError
    await seekVideo(video, k / FPS)
    paintMeme(ctx, width, height, meme, background, keyer.render(video), segments)
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
  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    withAudio: audio !== null,
  }
}
