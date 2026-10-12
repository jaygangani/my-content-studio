import { bestText, fitText, mix, roundRect, wrap } from '@/lib/carouselKit'
import type { CarouselSlide } from '@/types/script'

export type CarouselLayout =
  | 'steps'
  | 'checklist'
  | 'split'
  | 'stat'
  | 'quote'
  | 'tier'
  | 'cards'
  | 'chat'
  | 'level'
  | 'timeline'
  | 'grid'
  | 'flags'
  | 'editorial'
  | 'template'
  | 'poster'

export interface LayoutPalette {
  background: string
  alt: string
  text: string
  accent: string
  accentText: string
  muted: string
  decor: string
  decorStrong: string
  buttonFill: string
  buttonText: string
}

export interface LayoutArgs {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  margin: number
  top: number
  bottom: number
  slide: CarouselSlide
  index: number
  total: number
  palette: LayoutPalette
  headFont: (size: number) => string
  bodyFont: (size: number) => string
}

export interface LayoutResult {
  headlineLines: number
  headlineSize: number
  bodyLines: number
  bodySize: number
  bodyClamped: boolean
  headlineClamped: boolean
}

interface TextBlock {
  height: number
  lines: number
  size: number
  clamped: boolean
}

function drawBlock(
  a: LayoutArgs,
  text: string,
  font: (size: number) => string,
  x: number,
  y: number,
  maxWidth: number,
  start: number,
  min: number,
  maxLines: number,
  color: string,
  lineHeight = 1.15,
): TextBlock {
  if (!text.trim()) return { height: 0, lines: 0, size: 0, clamped: false }
  const fit = fitText(a.ctx, text, font, start, min, maxWidth, maxLines)
  a.ctx.font = font(fit.size)
  a.ctx.fillStyle = color
  a.ctx.textAlign = 'left'
  fit.lines.forEach((line, i) => {
    a.ctx.fillText(line, x, y + i * fit.size * lineHeight)
  })
  return {
    height: fit.lines.length * fit.size * lineHeight,
    lines: fit.lines.length,
    size: fit.size,
    clamped: fit.clamped,
  }
}

function result(head: TextBlock, body: TextBlock): LayoutResult {
  return {
    headlineLines: head.lines,
    headlineSize: head.size,
    bodyLines: body.lines,
    bodySize: body.size,
    bodyClamped: body.clamped,
    headlineClamped: head.clamped,
  }
}

const EMPTY: TextBlock = { height: 0, lines: 0, size: 0, clamped: false }

function parts(text: string): string[] {
  return text
    .split(/\|\||,|;|\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function split(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top, innerW, 68, 48, 2, palette.text)
  const [left = '', right = ''] = slide.body.split('||').map((part) => part.trim())
  const [leftLabel = 'Before', rightLabel = 'After'] = (slide.stat_label || '')
    .split('||')
    .map((part) => part.trim())
  const gap = 24
  const panelW = (innerW - gap) / 2
  const panelY = a.top + head.height + 48
  const panelH = Math.min(620, a.bottom - panelY)
  let bodyLines = 0
  let bodySize = 0
  let clamped = false
  ;[
    { x: margin, text: left, label: leftLabel, fill: palette.alt, ink: palette.text },
    {
      x: margin + panelW + gap,
      text: right,
      label: rightLabel,
      fill: palette.accent,
      ink: bestText(palette.accent),
    },
  ].forEach((panel) => {
    roundRect(ctx, panel.x, panelY, panelW, panelH, 36)
    ctx.fillStyle = panel.fill
    ctx.fill()
    ctx.font = a.bodyFont(26)
    ctx.fillStyle = panel.ink
    ctx.fillText(panel.label.toUpperCase(), panel.x + 36, panelY + 36)
    const block = drawBlock(
      a,
      panel.text,
      a.bodyFont,
      panel.x + 36,
      panelY + 96,
      panelW - 72,
      44,
      32,
      7,
      panel.ink,
      1.3,
    )
    bodyLines = Math.max(bodyLines, block.lines)
    bodySize = Math.max(bodySize, block.size)
    clamped = clamped || block.clamped
  })
  return result(head, { height: 0, lines: bodyLines, size: bodySize, clamped })
}

function stat(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const value = slide.stat_value?.trim() || slide.headline
  const big = fitText(ctx, value, a.headFont, 260, 110, innerW, 1)
  const y = a.top + 40
  ctx.font = a.headFont(big.size)
  ctx.fillStyle = palette.accentText
  ctx.fillText(big.lines[0], margin, y)
  const afterBig = y + big.size * 1.05
  ctx.fillStyle = palette.accent
  ctx.fillRect(margin, afterBig + 20, 120, 8)
  const label = drawBlock(
    a,
    slide.stat_label || slide.headline,
    a.headFont,
    margin,
    afterBig + 60,
    innerW,
    64,
    44,
    3,
    palette.text,
  )
  const body = drawBlock(
    a,
    slide.body,
    a.bodyFont,
    margin,
    afterBig + 60 + label.height + 28,
    innerW,
    40,
    32,
    3,
    mix(palette.text, palette.background, 0.2),
    1.38,
  )
  return result(label, body)
}

function quote(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  ctx.font = a.headFont(380)
  ctx.fillStyle = palette.decorStrong
  ctx.fillText('“', margin - 10, a.top - 40)
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top + 240, innerW, 84, 52, 5, palette.text)
  const y = a.top + 240 + head.height + 40
  ctx.fillStyle = palette.accent
  ctx.fillRect(margin, y, 90, 6)
  const body = drawBlock(a, slide.body, a.bodyFont, margin, y + 32, innerW, 38, 30, 2, palette.muted, 1.4)
  return result(head, body)
}

function tier(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const match = slide.headline.match(/^\s*([A-Za-z]{1,2})\s*[:\-–—]\s*(.+)$/)
  const letter = (match?.[1] ?? slide.headline.trim()[0] ?? 'S').toUpperCase()
  const title = match?.[2] ?? slide.headline
  const box = 170
  roundRect(ctx, margin, a.top, box, box, 36)
  ctx.fillStyle = palette.accent
  ctx.fill()
  ctx.font = a.headFont(120)
  ctx.fillStyle = bestText(palette.accent)
  ctx.textAlign = 'center'
  ctx.fillText(letter, margin + box / 2, a.top + 22)
  ctx.textAlign = 'left'
  const head = drawBlock(a, title, a.headFont, margin + box + 36, a.top + 20, innerW - box - 36, 64, 44, 3, palette.text)
  let x = margin
  let y = a.top + box + 56
  ctx.font = a.bodyFont(40)
  const items = parts(slide.body)
  for (const item of items) {
    const w = ctx.measureText(item).width + 56
    if (x + w > margin + innerW) {
      x = margin
      y += 92
    }
    roundRect(ctx, x, y, w, 72, 36)
    ctx.fillStyle = palette.alt
    ctx.fill()
    ctx.fillStyle = palette.text
    ctx.fillText(item, x + 28, y + 16)
    x += w + 16
  }
  return result(head, { ...EMPTY, lines: items.length, size: 40 })
}

function cards(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide, index } = a
  const innerW = width - margin * 2
  const cardH = Math.min(760, a.bottom - a.top)
  roundRect(ctx, margin, a.top, innerW, cardH, 44)
  ctx.fillStyle = palette.alt
  ctx.fill()
  const d = 100
  ctx.beginPath()
  ctx.arc(margin + 40 + d / 2, a.top + 40 + d / 2, d / 2, 0, Math.PI * 2)
  ctx.fillStyle = palette.accent
  ctx.fill()
  ctx.font = a.headFont(56)
  ctx.fillStyle = bestText(palette.accent)
  ctx.textAlign = 'center'
  ctx.fillText(String(index), margin + 40 + d / 2, a.top + 40 + d / 2 - 30)
  ctx.textAlign = 'left'
  const head = drawBlock(a, slide.headline, a.headFont, margin + 48, a.top + 190, innerW - 96, 72, 46, 3, palette.text)
  const body = drawBlock(a, slide.body, a.bodyFont, margin + 48, a.top + 190 + head.height + 32, innerW - 96, 40, 32, 5, palette.muted, 1.4)
  return result(head, body)
}

function chat(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const bubbleW = innerW * 0.82
  const pad = 40
  ctx.font = a.bodyFont(50)
  const q = fitText(ctx, slide.headline, a.bodyFont, 50, 36, bubbleW - pad * 2, 4)
  const qH = q.lines.length * q.size * 1.3 + pad * 2
  roundRect(ctx, margin, a.top, bubbleW, qH, 40)
  ctx.fillStyle = palette.alt
  ctx.fill()
  ctx.font = a.bodyFont(q.size)
  ctx.fillStyle = palette.text
  q.lines.forEach((line, i) => ctx.fillText(line, margin + pad, a.top + pad + i * q.size * 1.3))
  const ans = fitText(ctx, slide.body || slide.headline, a.bodyFont, 46, 34, bubbleW - pad * 2, 6)
  const aH = ans.lines.length * ans.size * 1.3 + pad * 2
  const ay = a.top + qH + 40
  const ax = margin + innerW - bubbleW
  roundRect(ctx, ax, ay, bubbleW, aH, 40)
  ctx.fillStyle = palette.buttonFill
  ctx.fill()
  ctx.font = a.bodyFont(ans.size)
  ctx.fillStyle = palette.buttonText
  ans.lines.forEach((line, i) => ctx.fillText(line, ax + pad, ay + pad + i * ans.size * 1.3))
  return {
    headlineLines: q.lines.length,
    headlineSize: q.size,
    bodyLines: ans.lines.length,
    bodySize: ans.size,
    bodyClamped: ans.clamped,
    headlineClamped: q.clamped,
  }
}

function level(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide, index, total } = a
  const innerW = width - margin * 2
  const steps = Math.max(1, total - 2)
  const gap = 14
  const segW = (innerW - gap * (steps - 1)) / steps
  for (let i = 0; i < steps; i += 1) {
    roundRect(ctx, margin + i * (segW + gap), a.top, segW, 22, 11)
    ctx.fillStyle = i < index ? palette.accent : palette.alt
    ctx.fill()
  }
  ctx.font = a.bodyFont(34)
  ctx.fillStyle = palette.accentText
  ctx.fillText(`LEVEL ${index} OF ${steps}`, margin, a.top + 64)
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top + 130, innerW, 96, 56, 3, palette.text)
  const body = drawBlock(a, slide.body, a.bodyFont, margin, a.top + 130 + head.height + 36, innerW, 42, 32, 4, mix(palette.text, palette.background, 0.15), 1.4)
  return result(head, body)
}

function timeline(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide, index, total } = a
  const railX = margin + 22
  ctx.strokeStyle = palette.decorStrong
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(railX, a.top)
  ctx.lineTo(railX, a.bottom)
  ctx.stroke()
  const nodes = Math.max(2, total - 2)
  for (let i = 0; i < nodes; i += 1) {
    const ny = a.top + 30 + (i * (a.bottom - a.top - 80)) / Math.max(1, nodes - 1)
    ctx.beginPath()
    ctx.arc(railX, ny, i + 1 === index ? 24 : 12, 0, Math.PI * 2)
    ctx.fillStyle = i + 1 === index ? palette.accent : palette.background
    ctx.fill()
    ctx.strokeStyle = palette.accent
    ctx.lineWidth = 5
    ctx.stroke()
  }
  const x = margin + 100
  const w = width - margin - x
  let y = a.top
  if (slide.stat_label?.trim()) {
    ctx.font = a.bodyFont(34)
    ctx.fillStyle = palette.accentText
    ctx.fillText(slide.stat_label.toUpperCase(), x, y)
    y += 64
  }
  const head = drawBlock(a, slide.headline, a.headFont, x, y, w, 74, 46, 4, palette.text)
  const body = drawBlock(a, slide.body, a.bodyFont, x, y + head.height + 28, w, 40, 32, 4, palette.muted, 1.4)
  return result(head, body)
}

function grid(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top, innerW, 68, 48, 2, palette.text)
  const items = slide.body.split('||').map((part) => part.trim()).filter(Boolean).slice(0, 4)
  const gap = 24
  const cellW = (innerW - gap) / 2
  const startY = a.top + head.height + 44
  const cellH = Math.min(300, (a.bottom - startY - gap) / 2)
  let lines = 0
  let size = 0
  let clamped = false
  items.forEach((item, i) => {
    const cx = margin + (i % 2) * (cellW + gap)
    const cy = startY + Math.floor(i / 2) * (cellH + gap)
    roundRect(ctx, cx, cy, cellW, cellH, 32)
    ctx.fillStyle = palette.alt
    ctx.fill()
    ctx.font = a.headFont(40)
    ctx.fillStyle = palette.accentText
    ctx.fillText(String(i + 1).padStart(2, '0'), cx + 32, cy + 28)
    const block = drawBlock(a, item, a.bodyFont, cx + 32, cy + 92, cellW - 64, 38, 28, 4, palette.text, 1.3)
    lines = Math.max(lines, block.lines)
    size = Math.max(size, block.size)
    clamped = clamped || block.clamped
  })
  return result(head, { height: 0, lines, size, clamped })
}

function flags(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const good = slide.icon !== 'x'
  const label = good ? 'GREEN FLAG' : 'RED FLAG'
  ctx.font = a.bodyFont(30)
  const w = ctx.measureText(label).width + 112
  roundRect(ctx, margin, a.top, w, 76, 38)
  if (good) {
    ctx.fillStyle = palette.accent
    ctx.fill()
  } else {
    ctx.strokeStyle = palette.text
    ctx.lineWidth = 4
    ctx.stroke()
  }
  ctx.fillStyle = good ? bestText(palette.accent) : palette.text
  ctx.fillText(label, margin + 84, a.top + 22)
  ctx.beginPath()
  ctx.arc(margin + 40, a.top + 38, 8, 0, Math.PI * 2)
  ctx.fill()
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top + 130, innerW, 88, 52, 4, palette.text)
  const body = drawBlock(a, slide.body, a.bodyFont, margin, a.top + 130 + head.height + 32, innerW, 42, 32, 3, palette.muted, 1.4)
  return result(head, body)
}

function editorial(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide, index } = a
  const innerW = width - margin * 2
  ctx.font = a.headFont(240)
  ctx.strokeStyle = palette.decorStrong
  ctx.lineWidth = 4
  ctx.strokeText(String(index).padStart(2, '0'), margin, a.top - 20)
  const y = a.top + 250
  ctx.fillStyle = palette.accent
  ctx.fillRect(margin, y, innerW, 4)
  const head = drawBlock(a, slide.headline, a.headFont, margin, y + 40, innerW, 92, 56, 4, palette.text)
  const by = y + 40 + head.height + 36
  const body = drawBlock(a, slide.body, a.bodyFont, margin + 36, by, innerW - 36, 40, 32, 4, palette.muted, 1.45)
  if (body.lines) {
    ctx.fillStyle = palette.accent
    ctx.fillRect(margin, by, 6, body.height - 8)
  }
  return result(head, body)
}

function template(a: LayoutArgs): LayoutResult {
  const { ctx, palette, margin, width, slide } = a
  const innerW = width - margin * 2
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top, innerW, 64, 46, 2, palette.text)
  const cardY = a.top + head.height + 40
  const cardH = Math.min(640, a.bottom - cardY)
  roundRect(ctx, margin, cardY, innerW, cardH, 36)
  ctx.fillStyle = palette.alt
  ctx.fill()
  ctx.setLineDash([14, 12])
  ctx.strokeStyle = palette.decorStrong
  ctx.lineWidth = 3
  ctx.stroke()
  ctx.setLineDash([])
  const size = 40
  ctx.font = a.bodyFont(size)
  const maxW = innerW - 80
  let x = margin + 40
  let y = cardY + 44
  let inBracket = false
  const tokens = slide.body.split(/(\s+)/).filter((t) => t.length)
  for (const token of tokens) {
    if (token.includes('[')) inBracket = true
    const w = ctx.measureText(token).width
    if (!/^\s+$/.test(token) && x + w > margin + 40 + maxW) {
      x = margin + 40
      y += size * 1.5
    }
    if (inBracket && !/^\s+$/.test(token)) {
      ctx.fillStyle = palette.accent
      ctx.fillRect(x - 6, y - 4, w + 12, size * 1.25)
      ctx.fillStyle = bestText(palette.accent)
    } else {
      ctx.fillStyle = palette.text
    }
    ctx.fillText(token, x, y)
    x += w
    if (token.includes(']')) inBracket = false
  }
  return result(head, { height: 0, lines: Math.ceil((y - cardY) / (size * 1.5)), size, clamped: false })
}

function poster(a: LayoutArgs): LayoutResult {
  const { palette, margin, width, height, slide } = a
  const innerW = width - margin * 2
  const blockBottom = height * 0.62
  const ink = bestText(palette.accent)
  const head = drawBlock(a, slide.headline, a.headFont, margin, a.top - 10, innerW, 140, 70, 5, ink, 1.02)
  const body = drawBlock(a, slide.body, a.bodyFont, margin, blockBottom + 56, innerW, 44, 32, 4, palette.text, 1.4)
  void blockBottom
  return result(head, body)
}

export const LAYOUT_PAINTERS: Partial<Record<CarouselLayout, (a: LayoutArgs) => LayoutResult>> = {
  split,
  stat,
  quote,
  tier,
  cards,
  chat,
  level,
  timeline,
  grid,
  flags,
  editorial,
  template,
  poster,
}

/** Painted behind the logo and text. Only the poster layout uses one. */
export function paintLayoutUnderlay(
  layout: string | undefined,
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  palette: LayoutPalette,
) {
  if (layout !== 'poster') return
  ctx.fillStyle = palette.accent
  ctx.fillRect(0, 180, width, height * 0.62 - 180)
}

export function isLayout(value: string | undefined): value is CarouselLayout {
  return Boolean(value && value in LAYOUT_PAINTERS) || value === 'steps' || value === 'checklist'
}

export { wrap }
