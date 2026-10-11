import { useCallback, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

export type SwipeDirection = 'left' | 'right'

const THRESHOLD_PX = 90

interface SwipeBindings {
  dx: number
  dragging: boolean
  bind: {
    onPointerDown: (event: PointerEvent<HTMLElement>) => void
    onPointerMove: (event: PointerEvent<HTMLElement>) => void
    onPointerUp: (event: PointerEvent<HTMLElement>) => void
    onPointerCancel: (event: PointerEvent<HTMLElement>) => void
  }
}

/** Horizontal swipe gesture: resolves left/right past a distance threshold. */
export function useSwipe(
  onSwipe: (direction: SwipeDirection) => void,
  enabled = true,
): SwipeBindings {
  const startX = useRef<number | null>(null)
  const [dx, setDx] = useState(0)

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled) return
      if ((event.target as HTMLElement).closest('button, input, textarea, a')) {
        return
      }
      startX.current = event.clientX
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [enabled],
  )

  const onPointerMove = useCallback((event: PointerEvent<HTMLElement>) => {
    if (startX.current === null) return
    setDx(event.clientX - startX.current)
  }, [])

  const finish = useCallback(
    (event: PointerEvent<HTMLElement>, commit: boolean) => {
      if (startX.current === null) return
      const delta = event.clientX - startX.current
      startX.current = null
      setDx(0)
      if (!commit) return
      if (delta > THRESHOLD_PX) onSwipe('right')
      else if (delta < -THRESHOLD_PX) onSwipe('left')
    },
    [onSwipe],
  )

  return {
    dx,
    dragging: startX.current !== null,
    bind: {
      onPointerDown,
      onPointerMove,
      onPointerUp: (event) => finish(event, true),
      onPointerCancel: (event) => finish(event, false),
    },
  }
}
