import type { BrandFont } from '@/lib/brand'

export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgbToHex(r: number, g: number, b: number): string {
  const part = (v: number) =>
    Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${part(r)}${part(g)}${part(b)}`
}

export function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

export function luminance(hex: string): number {
  const channel = (v: number) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

export function contrastRatio(a: string, b: string): number {
  const la = luminance(a)
  const lb = luminance(b)
  const [hi, lo] = la > lb ? [la, lb] : [lb, la]
  return (hi + 0.05) / (lo + 0.05)
}

export function bestText(background: string): string {
  return contrastRatio(background, '#ffffff') >= contrastRatio(background, '#0b0b0c')
    ? '#ffffff'
    : '#0b0b0c'
}

export function nearestWeight(font: BrandFont, wanted: number): number {
  return font.weights.reduce(
    (best, w) => (Math.abs(w - wanted) < Math.abs(best - wanted) ? w : best),
    font.weights[0],
  )
}


export function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = candidate
    }
  }
  if (current) lines.push(current)
  return lines
}

export function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  fontFor: (size: number) => string,
  startSize: number,
  minSize: number,
  maxWidth: number,
  maxLines: number,
): { lines: string[]; size: number; clamped: boolean } {
  let size = startSize
  for (; size >= minSize; size -= 4) {
    ctx.font = fontFor(size)
    const lines = wrap(ctx, text, maxWidth)
    if (lines.length <= maxLines) return { lines, size, clamped: false }
  }
  ctx.font = fontFor(minSize)
  const lines = wrap(ctx, text, maxWidth)
  if (lines.length <= maxLines) return { lines, size: minSize, clamped: false }
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
    last = last.slice(0, -1)
  }
  kept[maxLines - 1] = `${last.trimEnd()}…`
  return { lines: kept, size: minSize, clamped: true }
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

export function coverDraw(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource & { width?: number; height?: number },
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const el = image as HTMLImageElement
  const sw = el.naturalWidth || el.width || w
  const sh = el.naturalHeight || el.height || h
  const scale = Math.max(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

export function containDraw(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  align: 'left' | 'right' | 'center',
) {
  const sw = image.naturalWidth || image.width
  const sh = image.naturalHeight || image.height
  if (!sw || !sh) return
  const scale = Math.min(w / sw, h / sh)
  const dw = sw * scale
  const dh = sh * scale
  const dx = align === 'left' ? x : align === 'right' ? x + w - dw : x + (w - dw) / 2
  ctx.drawImage(image, dx, y + (h - dh) / 2, dw, dh)
}

export function drawIcon(
  ctx: CanvasRenderingContext2D,
  name: string,
  cx: number,
  cy: number,
  size: number,
  color: string,
) {
  const s = size / 2
  ctx.save()
  ctx.translate(cx, cy)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = size * 0.09
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  switch (name) {
    case 'x':
      ctx.moveTo(-s * 0.6, -s * 0.6)
      ctx.lineTo(s * 0.6, s * 0.6)
      ctx.moveTo(s * 0.6, -s * 0.6)
      ctx.lineTo(-s * 0.6, s * 0.6)
      ctx.stroke()
      break
    case 'arrow':
      ctx.moveTo(-s * 0.7, 0)
      ctx.lineTo(s * 0.7, 0)
      ctx.moveTo(s * 0.15, -s * 0.55)
      ctx.lineTo(s * 0.7, 0)
      ctx.lineTo(s * 0.15, s * 0.55)
      ctx.stroke()
      break
    case 'bolt':
      ctx.moveTo(s * 0.15, -s * 0.8)
      ctx.lineTo(-s * 0.45, s * 0.1)
      ctx.lineTo(0, s * 0.1)
      ctx.lineTo(-s * 0.15, s * 0.8)
      ctx.lineTo(s * 0.45, -s * 0.1)
      ctx.lineTo(0, -s * 0.1)
      ctx.closePath()
      ctx.fill()
      break
    case 'star': {
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? s * 0.8 : s * 0.35
        const a = -Math.PI / 2 + (i * Math.PI) / 5
        const px = Math.cos(a) * r
        const py = Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.fill()
      break
    }
    case 'clock':
      ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2)
      ctx.moveTo(0, -s * 0.4)
      ctx.lineTo(0, 0)
      ctx.lineTo(s * 0.35, s * 0.2)
      ctx.stroke()
      break
    case 'heart':
      ctx.moveTo(0, s * 0.7)
      ctx.bezierCurveTo(-s * 1.1, -s * 0.1, -s * 0.5, -s * 0.9, 0, -s * 0.3)
      ctx.bezierCurveTo(s * 0.5, -s * 0.9, s * 1.1, -s * 0.1, 0, s * 0.7)
      ctx.fill()
      break
    case 'target':
      ctx.arc(0, 0, s * 0.75, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.35, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'bulb':
      ctx.arc(0, -s * 0.2, s * 0.5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-s * 0.25, s * 0.5)
      ctx.lineTo(s * 0.25, s * 0.5)
      ctx.moveTo(-s * 0.15, s * 0.75)
      ctx.lineTo(s * 0.15, s * 0.75)
      ctx.stroke()
      break
    case 'chat':
      ctx.roundRect(-s * 0.75, -s * 0.6, s * 1.5, s * 1.05, s * 0.2)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(-s * 0.2, s * 0.45)
      ctx.lineTo(-s * 0.2, s * 0.85)
      ctx.lineTo(s * 0.2, s * 0.45)
      ctx.stroke()
      break
    default:
      ctx.moveTo(-s * 0.6, 0)
      ctx.lineTo(-s * 0.15, s * 0.5)
      ctx.lineTo(s * 0.65, -s * 0.5)
      ctx.stroke()
  }
  ctx.restore()
}

