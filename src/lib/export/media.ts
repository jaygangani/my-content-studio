import type { FrameMedia } from '@/lib/render'

export type LoadedMedia = HTMLImageElement | HTMLVideoElement

const CORS_HINT =
  'Could not load stock media for export (the source blocked cross-origin access).'

function once(target: EventTarget, ok: string): Promise<void> {
  return new Promise((resolve, reject) => {
    target.addEventListener(ok, () => resolve(), { once: true })
    target.addEventListener('error', () => reject(new Error(CORS_HINT)), {
      once: true,
    })
  })
}

/** Loads a frame's media fully, ready to draw or seek. */
export async function loadExportMedia(media: FrameMedia): Promise<LoadedMedia> {
  if (media.type === 'IMAGE') {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = media.url
    await once(image, 'load')
    return image
  }
  const video = document.createElement('video')
  video.crossOrigin = 'anonymous'
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = media.url
  await once(video, 'loadeddata')
  return video
}

export function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const duration = video.duration || 0
    const target = duration > 0 ? time % duration : 0
    if (Math.abs(video.currentTime - target) < 0.001) return resolve()
    video.addEventListener('seeked', () => resolve(), { once: true })
    video.addEventListener('error', () => reject(new Error(CORS_HINT)), {
      once: true,
    })
    video.currentTime = target
  })
}
