import { useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { OverlaySegment } from '@/types/content'
import { cn } from '@/lib/utils'

interface OverlayTimelineProps {
  segments: OverlaySegment[]
  totalLength: number
  currentTime: number
  selectedId: number | null
  onSelect: (id: number) => void
  onMove: (id: number, start: number, end: number) => void
}

function tickStep(total: number): number {
  const steps = [0.5, 1, 2, 5, 10, 15, 30]
  for (const step of steps) {
    if (total / step <= 24) return step
  }
  return 30
}

interface DragState {
  id: number
  startX: number
  origStart: number
  origEnd: number
}

export function OverlayTimeline({
  segments,
  totalLength,
  currentTime,
  selectedId,
  onSelect,
  onMove,
}: OverlayTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  if (totalLength <= 0) return null

  const step = tickStep(totalLength)
  const ticks: number[] = []
  for (let t = 0; t <= totalLength + 1e-6; t += step) {
    ticks.push(Math.round(t * 100) / 100)
  }

  const pct = (value: number) => `${(value / totalLength) * 100}%`

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!drag || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    const dt = ((event.clientX - drag.startX) / rect.width) * totalLength
    const dur = drag.origEnd - drag.origStart
    const start = Math.min(Math.max(0, drag.origStart + dt), totalLength - dur)
    const rounded = Math.round(start * 100) / 100
    onMove(drag.id, rounded, Math.round((rounded + dur) * 100) / 100)
  }

  return (
    <div className="overflow-x-auto">
      <div
        ref={trackRef}
        className="relative h-16 min-w-[480px] overflow-hidden rounded-md border border-hairline bg-surface-cool/30"
        onPointerMove={handlePointerMove}
        onPointerUp={() => setDrag(null)}
        onPointerCancel={() => setDrag(null)}
      >
        {ticks.map((t) => (
          <div
            key={t}
            className="absolute top-0 h-full border-l border-hairline-soft"
            style={{ left: pct(t) }}
          >
            <span className="absolute left-1 top-0.5 text-[9px] text-slate">
              {t}s
            </span>
          </div>
        ))}

        {segments.map((segment) => (
          <button
            key={segment.segment_id}
            type="button"
            onPointerDown={(event) => {
              event.preventDefault()
              onSelect(segment.segment_id)
              event.currentTarget.setPointerCapture(event.pointerId)
              setDrag({
                id: segment.segment_id,
                startX: event.clientX,
                origStart: segment.start_time_sec,
                origEnd: segment.end_time_sec,
              })
            }}
            className={cn(
              'absolute top-5 h-8 rounded border px-1.5 text-left text-[10px] leading-tight transition-colors',
              selectedId === segment.segment_id
                ? 'border-ink bg-ink text-white'
                : 'border-hairline bg-canvas text-graphite hover:border-ink hover:text-ink',
            )}
            style={{
              left: pct(segment.start_time_sec),
              width: `max(${(segment.duration_sec / totalLength) * 100}%, 1.5rem)`,
            }}
            title={segment.text}
          >
            <span className="block truncate">{segment.text}</span>
          </button>
        ))}

        <div
          className="pointer-events-none absolute top-0 h-full w-px bg-ink"
          style={{ left: pct(Math.min(currentTime, totalLength)) }}
        />
      </div>
    </div>
  )
}
