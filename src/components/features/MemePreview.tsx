import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { createKeyer } from '@/lib/chromaKey'
import { buildMemeSegments, memeBackgroundAsset, paintMeme } from '@/lib/meme'
import { ensureOverlayFonts, groupOffsets, overlayBox } from '@/lib/overlayText'
import { pieceStyles, surfaceFor } from '@/lib/render'
import { cn } from '@/lib/utils'
import type { AssetItem } from '@/services/assets'
import { getMediaUrl } from '@/services/storage'
import type { PieceScript, TextRole } from '@/types/script'
import { isMemeScript } from '@/types/script'

interface MemePreviewProps {
  script: PieceScript
  assets: AssetItem[]
  className?: string
  editable?: boolean
  onSelectRole?: (role: TextRole) => void
  onMoveRole?: (role: TextRole, x: number, y: number) => void
}

const PREVIEW_WIDTH = 540

/**
 * Live preview of a green screen meme reel: background, chroma-keyed looping
 * clip and the text block, painted through the same `paintMeme` the exporter
 * uses.
 */
export function MemePreview({
  script,
  assets,
  className,
  editable = false,
  onSelectRole,
  onMoveRole,
}: MemePreviewProps) {
  const meme = isMemeScript(script) ? script.payload.meme : null
  const surface = surfaceFor('REEL')
  const height = Math.round((PREVIEW_WIDTH * surface.height) / surface.width)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const bgRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const segments = useMemo(() => buildMemeSegments(script), [script])
  const background = useMemo(
    () => (meme ? memeBackgroundAsset(meme, assets) : null),
    [meme, assets],
  )
  const videoKey = meme?.videoKey
  const keyColor = meme?.keyColor ?? '#00ff00'

  const scriptRef = useRef({ meme, segments, editable })
  scriptRef.current = { meme, segments, editable }

  useEffect(() => {
    if (!videoKey) return
    let cancelled = false
    setClipUrl(null)
    setLoadError(null)
    void getMediaUrl(videoKey)
      .then((url) => {
        if (!cancelled) setClipUrl(url)
      })
      .catch(() => {
        if (!cancelled) setLoadError('Could not load the green screen video.')
      })
    return () => {
      cancelled = true
    }
  }, [videoKey])

  useEffect(() => {
    let cancelled = false
    setFontsReady(false)
    void ensureOverlayFonts(pieceStyles(script)).then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [script.textStyle, JSON.stringify(script.textOverrides ?? {})])

  useEffect(() => {
    if (!background) {
      bgRef.current = null
      return
    }
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.src = background.url
    bgRef.current = image
  }, [background])

  useEffect(() => {
    if (!clipUrl) return
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = clipUrl
    video.addEventListener('error', () =>
      setLoadError('Could not load the green screen video.'),
    )
    videoRef.current = video
    void video.play().catch(() => undefined)
    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      videoRef.current = null
    }
  }, [clipUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !meme) return
    video.muted = muted
    video.volume = Math.min(1, Math.max(0, meme.clip.volume))
  }, [muted, meme, clipUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) void video.play().catch(() => undefined)
    else video.pause()
  }, [playing, clipUrl])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !fontsReady) return
    const keyer = createKeyer(keyColor, 540)
    let raf = 0
    const tick = () => {
      const state = scriptRef.current
      if (state.meme) {
        const video = videoRef.current
        const keyed = video ? keyer.render(video) : null
        paintMeme(
          ctx,
          canvas.width,
          canvas.height,
          state.meme,
          bgRef.current,
          keyed,
          state.segments,
        )
        if (state.editable && state.segments[0]) {
          const box = overlayBox(
            ctx,
            state.segments[0],
            canvas.width,
            canvas.height,
            groupOffsets(ctx, state.segments, canvas.width, canvas.height).get(
              state.segments[0],
            ),
          )
          ctx.save()
          ctx.setLineDash([8, 6])
          ctx.lineWidth = 2
          ctx.strokeStyle = '#ffffff'
          ctx.strokeRect(box.x - 4, box.y - 4, box.width + 8, box.height + 8)
          ctx.restore()
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [fontsReady, keyColor, clipUrl])

  const toCanvas = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
      width: canvas.width,
      height: canvas.height,
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const item = segments[0]
    if (!editable || !item) return
    const ctx = event.currentTarget.getContext('2d')
    if (!ctx) return
    const point = toCanvas(event)
    const box = overlayBox(ctx, item, point.width, point.height)
    if (
      point.x >= box.x &&
      point.x <= box.x + box.width &&
      point.y >= box.y &&
      point.y <= box.y + box.height
    ) {
      onSelectRole?.('hook')
      drag.current = {
        dx: point.x - (box.x + box.width / 2),
        dy: point.y - (box.y + box.height / 2),
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const point = toCanvas(event)
    const x = Math.min(0.95, Math.max(0.05, (point.x - drag.current.dx) / point.width))
    const y = Math.min(0.95, Math.max(0.05, (point.y - drag.current.dy) / point.height))
    onMoveRole?.('hook', x, y)
  }

  const handlePointerUp = () => {
    drag.current = null
  }

  return (
    <div className={cn('relative mx-auto w-full max-w-[360px]', className)}>
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ touchAction: editable ? 'none' : undefined }}
        className={cn(
          'w-full rounded-lg border border-hairline bg-ink',
          editable && 'cursor-grab',
        )}
      />
      {loadError ? (
        <p className="mt-3 text-sm text-graphite">{loadError}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-between text-sm text-graphite">
        <span className="tabular-nums">Loops to {meme?.loopSeconds ?? 0}s</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={playing ? 'Pause' : 'Play'}
            onClick={() => setPlaying((value) => !value)}
            className="rounded-full bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary-active"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            aria-label={muted ? 'Sound on' : 'Mute'}
            onClick={() => setMuted((value) => !value)}
            className="rounded-full p-2.5 transition-colors hover:bg-muted hover:text-ink"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </button>
        </div>
      </div>
    </div>
  )
}
