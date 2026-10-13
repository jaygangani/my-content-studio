const SOFT_LOW = 0.08
const SOFT_HIGH = 0.22

export const DEFAULT_KEY_COLOR = '#00ff00'

function parseHex(hex: string): [number, number, number] {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  const value = match ? match[1] : '00ff00'
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

function chroma(r: number, g: number, b: number): [number, number] {
  return [
    (-0.169 * r - 0.331 * g + 0.5 * b) / 255,
    (0.5 * r - 0.419 * g - 0.081 * b) / 255,
  ]
}

export interface Keyer {
  /** Draws the video frame with the key colour made transparent. */
  render: (source: HTMLVideoElement) => HTMLCanvasElement | null
}

/**
 * Chroma keyer in YCbCr space: distance of each pixel's chroma to the key
 * colour's chroma drives the alpha (soft edge), and the key channel is
 * clamped to suppress spill on edges.
 */
export function createKeyer(keyColor: string, maxSide = 720): Keyer {
  const [kr, kg, kb] = parseHex(keyColor)
  const [kcb, kcr] = chroma(kr, kg, kb)
  const dominant = kr >= kg && kr >= kb ? 0 : kg >= kb ? 1 : 2
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })

  return {
    render(source) {
      if (!ctx || source.readyState < 2) return null
      const sw = source.videoWidth
      const sh = source.videoHeight
      if (!sw || !sh) return null
      const scale = Math.min(1, maxSide / Math.max(sw, sh))
      const w = Math.max(1, Math.round(sw * scale))
      const h = Math.max(1, Math.round(sh * scale))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      ctx.drawImage(source, 0, 0, w, h)
      const image = ctx.getImageData(0, 0, w, h)
      const px = image.data
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i]
        const g = px[i + 1]
        const b = px[i + 2]
        const [cb, cr] = chroma(r, g, b)
        const distance = Math.hypot(cb - kcb, cr - kcr)
        if (distance >= SOFT_HIGH) continue
        const t = Math.max(
          0,
          Math.min(1, (distance - SOFT_LOW) / (SOFT_HIGH - SOFT_LOW)),
        )
        px[i + 3] = Math.round(px[i + 3] * t * t * (3 - 2 * t))
        if (t < 1) {
          const others = [r, g, b].filter((_, c) => c !== dominant)
          const limit = (others[0] + others[1]) / 2
          if (px[i + dominant] > limit) px[i + dominant] = limit
        }
      }
      ctx.putImageData(image, 0, 0)
      return canvas
    },
  }
}
