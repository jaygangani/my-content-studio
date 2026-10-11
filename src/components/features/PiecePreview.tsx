import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  RotateCcw,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { ensureOverlayFonts, groupOffsets, overlayBox } from '@/lib/overlayText'
import {
  buildFrames,
  drawFrame,
  drawTransitionFrame,
  pieceStyles,
  surfaceFor,
  transitionKind,
  transitionLength,
} from '@/lib/render'
import type { Frame, FrameMedia } from '@/lib/render'
import { cn } from '@/lib/utils'
import type { AssetItem } from '@/services/assets'
import type { PieceScript, TextRole } from '@/types/script'

interface PiecePreviewProps {
  script: PieceScript
  assets: AssetItem[]
  className?: string
  editable?: boolean
  selectedRole?: TextRole
  onSelectRole?: (role: TextRole) => void
  onMoveRole?: (role: TextRole, x: number, y: number) => void
  onFrameChange?: (index: number) => void
}

const SEGMENT_ROLES: Record<number, TextRole> = { 1: 'hook', 2: 'body', 3: 'cta' }

function roleOf(segmentId: number): TextRole {
  return SEGMENT_ROLES[segmentId] ?? 'body'
}

const PREVIEW_WIDTH = 540
const TICK_MS = 100

type MediaElement = HTMLImageElement | HTMLVideoElement

function loadMedia(media: FrameMedia): MediaElement {
  if (media.type === 'VIDEO') {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.loop = true
    video.playsInline = true
    video.preload = 'auto'
    video.src = media.url
    return video
  }
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.src = media.url
  return image
}

function formatTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

/**
 * Live preview of a piece. Reels play through their beats with play/pause,
 * restart, previous/next beat and a scrubber; carousels and stories step with
 * arrows. Draws via the same `drawFrame` as the exporters.
 */
export function PiecePreview({
  script,
  assets,
  className,
  editable = false,
  selectedRole,
  onSelectRole,
  onMoveRole,
  onFrameChange,
}: PiecePreviewProps) {
  const frames = useMemo<Frame[]>(
    () => buildFrames(script, assets),
    [script, assets],
  )
  const surface = surfaceFor(script.schema)
  const height = Math.round((PREVIEW_WIDTH * surface.height) / surface.width)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const mediaCache = useRef(new Map<string, MediaElement>())
  const activeMedia = useRef<MediaElement | null>(null)
  const pendingSeek = useRef<number | null>(null)
  const [index, setIndex] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [fontsReady, setFontsReady] = useState(false)
  const drag = useRef<{ role: TextRole; dx: number; dy: number } | null>(null)
  const isReel = script.schema === 'REEL'
  const current = frames[Math.min(index, frames.length - 1)]
  const total = useMemo(
    () => frames.reduce((sum, frame) => sum + frame.seconds, 0),
    [frames],
  )
  const startOf = useMemo(() => {
    let cursor = 0
    return frames.map((frame) => {
      const start = cursor
      cursor += frame.seconds
      return start
    })
  }, [frames])
  const position = (startOf[index] ?? 0) + elapsed

  const styleKey = `${script.textStyle ?? ''}:${JSON.stringify(script.textOverrides ?? {})}:${JSON.stringify(script.frameOverrides ?? {})}`
  useEffect(() => {
    let cancelled = false
    setFontsReady(false)
    void ensureOverlayFonts(pieceStyles(script)).then(() => {
      if (!cancelled) setFontsReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [styleKey])

  const lastIndex = useRef(0)
  const prevIndex = useRef(-1)
  const startedAt = useRef(0)

  useEffect(() => {
    setIndex(0)
    setElapsed(0)
    lastIndex.current = 0
    prevIndex.current = -1
  }, [script.schema, frames.length])

  useEffect(() => {
    if (lastIndex.current !== index) {
      prevIndex.current = lastIndex.current
      lastIndex.current = index
      startedAt.current = performance.now()
    }
  }, [index])

  useEffect(() => {
    if (editable) setPlaying(false)
  }, [editable])

  const frameChangeRef = useRef(onFrameChange)
  frameChangeRef.current = onFrameChange
  useEffect(() => {
    frameChangeRef.current?.(index)
  }, [index])

  useEffect(() => {
    if (!isReel || !playing || frames.length === 0) return
    const timer = window.setInterval(
      () => setElapsed((value) => value + TICK_MS / 1000),
      TICK_MS,
    )
    return () => window.clearInterval(timer)
  }, [isReel, playing, frames.length])

  useEffect(() => {
    if (!isReel || !playing || !current) return
    if (elapsed >= Math.max(0.5, current.seconds)) {
      setIndex((i) => (i + 1) % frames.length)
      setElapsed(0)
    }
  }, [elapsed, isReel, playing, current, frames.length])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || !current || !fontsReady) return

    let element: MediaElement | null = null
    if (current.media) {
      const cached = mediaCache.current.get(current.media.url)
      element = cached ?? loadMedia(current.media)
      mediaCache.current.set(current.media.url, element)
      if (element instanceof HTMLVideoElement) {
        const offset = pendingSeek.current ?? 0
        pendingSeek.current = null
        const duration = element.duration || 0
        element.currentTime = duration > 0 ? offset % duration : 0
        if (isReel ? playingRef.current : true) {
          void element.play().catch(() => undefined)
        }
      }
    }
    activeMedia.current = element

    const currentIndex = Math.min(index, frames.length - 1)
    const outgoing =
      isReel && prevIndex.current >= 0 && prevIndex.current !== currentIndex
        ? frames[prevIndex.current]
        : undefined
    let outgoingElement: MediaElement | null = null
    if (outgoing?.media) {
      const cached = mediaCache.current.get(outgoing.media.url)
      outgoingElement = cached ?? loadMedia(outgoing.media)
      mediaCache.current.set(outgoing.media.url, outgoingElement)
      if (outgoingElement instanceof HTMLVideoElement) {
        void outgoingElement.play().catch(() => undefined)
      }
    }
    const blend = transitionLength(current)
    const kind = transitionKind(currentIndex)

    let raf = 0
    const tick = () => {
      const progress = outgoing
        ? (performance.now() - startedAt.current) / 1000 / blend
        : 1
      if (outgoing && progress < 1) {
        drawTransitionFrame(
          ctx,
          canvas.width,
          canvas.height,
          kind,
          progress,
          { source: outgoingElement, frame: outgoing },
          { source: element, frame: current },
        )
      } else {
        drawFrame(
          ctx,
          canvas.width,
          canvas.height,
          element,
          current.segments,
          current.scrim,
        )
      }
      if (editable) {
        const selected = current.segments.find(
          (item) => roleOf(item.segment_id) === selectedRoleRef.current,
        )
        if (selected) {
          const forced = groupOffsets(
            ctx,
            current.segments,
            canvas.width,
            canvas.height,
          ).get(selected)
          const box = overlayBox(
            ctx,
            selected,
            canvas.width,
            canvas.height,
            forced,
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
    return () => {
      cancelAnimationFrame(raf)
      if (element instanceof HTMLVideoElement) element.pause()
      if (outgoingElement instanceof HTMLVideoElement) outgoingElement.pause()
      activeMedia.current = null
    }
  }, [current, fontsReady, isReel, editable])

  const selectedRoleRef = useRef(selectedRole)
  selectedRoleRef.current = selectedRole

  const playingRef = useRef(playing)
  playingRef.current = playing

  useEffect(() => {
    const element = activeMedia.current
    if (!(element instanceof HTMLVideoElement)) return
    if (playing) void element.play().catch(() => undefined)
    else element.pause()
  }, [playing])

  const goTo = useCallback(
    (nextIndex: number, offset = 0) => {
      if (!frames.length) return
      const bounded = (nextIndex + frames.length) % frames.length
      pendingSeek.current = offset
      setIndex(bounded)
      setElapsed(offset)
      const element = activeMedia.current
      if (bounded === index && element instanceof HTMLVideoElement) {
        const duration = element.duration || 0
        element.currentTime = duration > 0 ? offset % duration : 0
        pendingSeek.current = null
      }
    },
    [frames.length, index],
  )

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
    if (!editable || !current) return
    const ctx = event.currentTarget.getContext('2d')
    if (!ctx) return
    const point = toCanvas(event)
    const offsets = groupOffsets(ctx, current.segments, point.width, point.height)
    for (const item of [...current.segments].reverse()) {
      const box = overlayBox(
        ctx,
        item,
        point.width,
        point.height,
        offsets.get(item),
      )
      if (
        point.x >= box.x &&
        point.x <= box.x + box.width &&
        point.y >= box.y &&
        point.y <= box.y + box.height
      ) {
        const role = roleOf(item.segment_id)
        onSelectRole?.(role)
        drag.current = {
          role,
          dx: point.x - (box.x + box.width / 2),
          dy: point.y - (box.y + box.height / 2),
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        return
      }
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    const point = toCanvas(event)
    const x = Math.min(0.95, Math.max(0.05, (point.x - drag.current.dx) / point.width))
    const y = Math.min(0.95, Math.max(0.05, (point.y - drag.current.dy) / point.height))
    onMoveRole?.(drag.current.role, x, y)
  }

  const handlePointerUp = () => {
    drag.current = null
  }

  const scrub = (time: number) => {
    let target = 0
    for (let i = 0; i < frames.length; i += 1) {
      if (time >= (startOf[i] ?? 0)) target = i
    }
    goTo(target, Math.max(0, time - (startOf[target] ?? 0)))
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

      {isReel && frames.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          <input
            type="range"
            min={0}
            max={Math.max(0.1, total)}
            step={0.1}
            value={Math.min(position, total)}
            aria-label="Seek"
            onChange={(e) => scrub(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex flex-wrap items-center justify-between gap-y-1 text-sm text-graphite">
            <span className="tabular-nums">
              {formatTime(position)} / {formatTime(total)}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Restart"
                onClick={() => goTo(0)}
                className="rounded-full p-2.5 transition-colors hover:bg-muted hover:text-ink"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Previous beat"
                onClick={() => goTo(index - 1)}
                className="rounded-full p-2.5 transition-colors hover:bg-muted hover:text-ink"
              >
                <SkipBack className="size-4" />
              </button>
              <button
                type="button"
                aria-label={playing ? 'Pause' : 'Play'}
                onClick={() => setPlaying((value) => !value)}
                className="rounded-full bg-primary p-3 text-primary-foreground transition-colors hover:bg-primary-active"
              >
                {playing ? (
                  <Pause className="size-4" />
                ) : (
                  <Play className="size-4" />
                )}
              </button>
              <button
                type="button"
                aria-label="Next beat"
                onClick={() => goTo(index + 1)}
                className="rounded-full p-2.5 transition-colors hover:bg-muted hover:text-ink"
              >
                <SkipForward className="size-4" />
              </button>
            </div>
            <span className="tabular-nums">
              Beat {index + 1}/{frames.length}
            </span>
          </div>
        </div>
      ) : null}

      {!isReel && frames.length > 1 ? (
        <div className="mt-3 flex items-center justify-center gap-4 text-sm text-graphite">
          <button
            type="button"
            aria-label="Previous slide"
            disabled={index === 0}
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            className="disabled:opacity-30"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span>
            {index + 1} / {frames.length}
          </span>
          <button
            type="button"
            aria-label="Next slide"
            disabled={index === frames.length - 1}
            onClick={() => setIndex((i) => Math.min(frames.length - 1, i + 1))}
            className="disabled:opacity-30"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      ) : null}
    </div>
  )
}
