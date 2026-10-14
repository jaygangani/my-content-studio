import { useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { ensureOverlayFonts, overlayBox } from '@/lib/overlayText'
import { pieceStyles, surfaceFor } from '@/lib/render'
import { buildViralSegment, paintViral } from '@/lib/viral'
import { cn } from '@/lib/utils'
import { getMediaUrl } from '@/services/storage'
import type { PieceScript, TextRole } from '@/types/script'
import { isViralScript } from '@/types/script'

interface ViralPreviewProps {
  script: PieceScript
  className?: string
  editable?: boolean
  onSelectRole?: (role: TextRole) => void
}

const PREVIEW_WIDTH = 540

/** Live preview of a viral clip reel, painted by the same `paintViral` as export. */
export function ViralPreview({
  script,
  className,
  editable = false,
  onSelectRole,
}: ViralPreviewProps) {
  const viral = isViralScript(script) ? script.payload.viral : null
  const surface = surfaceFor('REEL')
  const height = Math.round((PREVIEW_WIDTH * surface.height) / surface.width)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [clipUrl, setClipUrl] = useState<string | null>(null)
  const [fontsReady, setFontsReady] = useState(false)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const segment = useMemo(() => buildViralSegment(script), [script])
  const videoKey = viral?.videoKey
  const state = useRef({ viral, segment, editable })
  state.current = { viral, segment, editable }

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
        if (!cancelled) setLoadError('Could not load the video.')
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
    if (!clipUrl) return
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = clipUrl
    video.addEventListener('error', () => setLoadError('Could not load the video.'))
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
    if (!video || !viral) return
    video.muted = muted
    video.volume = Math.min(1, Math.max(0, viral.clip.volume))
  }, [muted, viral, clipUrl])

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
    let raf = 0
    const tick = () => {
      const current = state.current
      if (current.viral) {
        paintViral(
          ctx,
          canvas.width,
          canvas.height,
          current.viral,
          videoRef.current,
          current.segment,
        )
        if (current.editable && current.segment) {
          const box = overlayBox(
            ctx,
            { ...current.segment, anchor: { x: 0.5, y: 0.14 } },
            canvas.width,
            canvas.height,
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
  }, [fontsReady, clipUrl])

  return (
    <div className={cn('relative mx-auto w-full max-w-[360px]', className)}>
      <canvas
        ref={canvasRef}
        width={PREVIEW_WIDTH}
        height={height}
        onPointerDown={() => editable && onSelectRole?.('hook')}
        className="w-full rounded-lg border border-hairline bg-ink"
      />
      {loadError ? <p className="mt-3 text-sm text-graphite">{loadError}</p> : null}
      <div className="mt-3 flex items-center justify-between text-sm text-graphite">
        <span className="tabular-nums">
          {Math.round(viral?.durationSeconds ?? 0)}s clip
        </span>
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
