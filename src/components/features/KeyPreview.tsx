import { useEffect, useRef, useState } from 'react'
import { createKeyer } from '@/lib/chromaKey'

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

const PREVIEW_SIDE = 360

/** Keyed preview with side-by-side source: click the source to pick the key. */
export function KeyPreview({
  url,
  keyColor,
  onPick,
}: {
  url: string
  keyColor: string
  onPick: (hex: string) => void
}) {
  const sourceRef = useRef<HTMLCanvasElement | null>(null)
  const keyedRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.src = url
    video.addEventListener('error', () =>
      setError('This video could not be loaded.'),
    )
    videoRef.current = video
    void video.play().catch(() => undefined)
    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      videoRef.current = null
    }
  }, [url])

  useEffect(() => {
    const keyer = createKeyer(keyColor, PREVIEW_SIDE * 2)
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const source = sourceRef.current
      const keyedCanvas = keyedRef.current
      if (video && source && keyedCanvas && video.readyState >= 2) {
        const ratio = video.videoWidth / video.videoHeight || 9 / 16
        const w = Math.round(PREVIEW_SIDE * Math.min(1, ratio))
        const h = Math.round(w / ratio)
        for (const canvas of [source, keyedCanvas]) {
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
        }
        source.getContext('2d')?.drawImage(video, 0, 0, w, h)
        const keyed = keyer.render(video)
        const ctx = keyedCanvas.getContext('2d')
        if (ctx && keyed) {
          ctx.clearRect(0, 0, w, h)
          ctx.drawImage(keyed, 0, 0, w, h)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [keyColor])

  const handlePick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width)
    const y = Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    try {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      onPick(toHex(r, g, b))
    } catch {
      setError('Cannot read colours from this video (blocked cross-origin).')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-[13px] text-stone">Source. Click the green.</p>
          <canvas
            ref={sourceRef}
            onPointerDown={handlePick}
            className="w-full cursor-crosshair rounded-md border border-hairline bg-ink"
          />
        </div>
        <div>
          <p className="mb-2 text-[13px] text-stone">Keyed result</p>
          <canvas
            ref={keyedRef}
            className="w-full rounded-md border border-hairline"
            style={{
              backgroundColor: '#ffffff',
              backgroundImage:
                'linear-gradient(45deg,#d4d4d4 25%,transparent 25%,transparent 75%,#d4d4d4 75%),linear-gradient(45deg,#d4d4d4 25%,transparent 25%,transparent 75%,#d4d4d4 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 8px 8px',
            }}
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-ink">{error}</p> : null}
    </div>
  )
}
