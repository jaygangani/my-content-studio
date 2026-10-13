import { getBrandFont, getVisualStyle } from '@/lib/brand'
import {
  CAROUSEL_HEIGHT,
  CAROUSEL_WIDTH,
  MARGIN,
  drawDecor,
  paletteFor,
  pickLogo,
} from '@/lib/carousel'
import type { BrandAssets, DecorKind, Palette } from '@/lib/carousel'
import {
  bestText,
  containDraw,
  coverDraw,
  drawIcon,
  fitText,
  mix,
  nearestWeight,
  roundRect,
} from '@/lib/carouselKit'

export interface ImagePostInput {
  lines: string[]
  layout?: string
  formatId: number
  formatName: string
  scheme?: string
}

/** Short label shown in the corner opposite the logo. */
const TAGS: Record<number, string> = {
  17: 'ME WHEN',
  18: 'EXPECTATION VS REALITY',
  19: 'CHOOSE ONE',
  20: 'NOBODY:',
  21: 'TELL ME',
  53: 'REAL REVIEW',
  64: 'NOTIFICATIONS',
  65: 'TO-DO VS REALITY',
  66: 'ALIGNMENT CHART',
  67: 'THE TAKE',
  68: 'VENN DIAGRAM',
  70: 'BREAKING',
  71: 'POST',
  72: 'CAPTION THIS',
}

const COLUMN_LABELS: Record<number, [string, string]> = {
  18: ['Expectation', 'Reality'],
  65: ['Planned', 'Reality'],
}

interface Area {
  x: number
  y: number
  w: number
  h: number
}

interface Fonts {
  head: (size: number) => string
  body: (size: number) => string
  bodyBold: (size: number) => string
}

interface Painter {
  ctx: CanvasRenderingContext2D
  area: Area
  lines: string[]
  palette: Palette
  fonts: Fonts
  formatId: number
}

function textBlock(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: (size: number) => string,
  start: number,
  min: number,
  maxWidth: number,
  maxLines: number,
  lineHeight: number,
) {
  const fit = fitText(ctx, text, font, start, min, maxWidth, maxLines)
  return { ...fit, height: fit.lines.length * fit.size * lineHeight, lineHeight }
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  block: ReturnType<typeof textBlock>,
  font: (size: number) => string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign = 'left',
) {
  ctx.font = font(block.size)
  ctx.fillStyle = color
  ctx.textAlign = align
  block.lines.forEach((line, i) => {
    ctx.fillText(line, x, y + i * block.size * block.lineHeight)
  })
}

function paintCard({ ctx, area, lines, palette, fonts }: Painter) {
  const main = textBlock(ctx, lines[0] ?? '', fonts.head, 112, 52, area.w, 7, 1.12)
  const second = lines[1]?.trim()
    ? textBlock(ctx, lines[1], fonts.body, 48, 32, area.w, 3, 1.3)
    : null
  const gap = second ? 44 : 0
  const total = main.height + gap + (second?.height ?? 0)
  let y = area.y + Math.max(0, (area.h - total) / 2)
  ctx.fillStyle = palette.accent
  ctx.fillRect(area.x, y - 36, 120, 10)
  drawLines(ctx, main, fonts.head, area.x, y, palette.text)
  y += main.height + gap
  if (second) {
    drawLines(ctx, second, fonts.body, area.x, y, mix(palette.text, palette.background, 0.2))
  }
}

function paintColumns({ ctx, area, lines, palette, fonts, formatId }: Painter) {
  const rows = lines
    .map((line) => line.split('||').map((part) => part.trim()))
    .filter((parts) => parts[0] || parts[1])
  if (!rows.length) return
  const labels = COLUMN_LABELS[formatId]
  const labelH = labels ? 64 : 0
  const gap = 20
  const colW = (area.w - gap) / 2
  const rowH = Math.min(
    rows.length === 1 ? 560 : 230,
    (area.h - labelH - gap * (rows.length - 1)) / rows.length,
  )
  const total = labelH + rows.length * rowH + gap * (rows.length - 1)
  let y = area.y + Math.max(0, (area.h - total) / 2)
  if (labels) {
    ctx.font = fonts.bodyBold(32)
    ctx.textAlign = 'left'
    ctx.fillStyle = palette.muted
    ctx.fillText(labels[0].toUpperCase(), area.x + 8, y + 12)
    ctx.fillStyle = palette.accentText
    ctx.fillText(labels[1].toUpperCase(), area.x + colW + gap + 8, y + 12)
    y += labelH
  }
  const rightFill = palette.buttonFill
  const rightText = palette.buttonText
  rows.forEach(([left, right = ''], index) => {
    const top = y + index * (rowH + gap)
    const startSize = rows.length === 1 ? 72 : 46
    for (const side of [0, 1] as const) {
      const x = area.x + side * (colW + gap)
      roundRect(ctx, x, top, colW, rowH, 28)
      ctx.fillStyle = side === 0 ? palette.alt : rightFill
      ctx.fill()
      const color = side === 0 ? palette.text : rightText
      const block = textBlock(
        ctx,
        side === 0 ? left : right,
        fonts.bodyBold,
        startSize,
        26,
        colW - 56,
        rows.length === 1 ? 8 : 4,
        1.2,
      )
      drawLines(ctx, block, fonts.bodyBold, x + 28, top + (rowH - block.height) / 2, color)
    }
  })
}

function paintNobody({ ctx, area, lines, palette, fonts }: Painter) {
  const last = Math.max(0, lines.length - 1)
  const blocks = lines.map((line, i) =>
    i === last
      ? textBlock(ctx, line, fonts.head, 96, 48, area.w, 6, 1.12)
      : textBlock(ctx, line, fonts.body, 68, 40, area.w, 2, 1.15),
  )
  const gap = 56
  const total = blocks.reduce((sum, b) => sum + b.height, 0) + gap * (blocks.length - 1)
  let y = area.y + Math.max(0, (area.h - total) / 2)
  blocks.forEach((block, i) => {
    if (i === last) {
      ctx.fillStyle = palette.accent
      ctx.fillRect(area.x, y - 30, 120, 10)
      drawLines(ctx, block, fonts.head, area.x, y, palette.text)
    } else {
      drawLines(ctx, block, fonts.body, area.x, y, palette.muted)
    }
    y += block.height + gap
  })
}

function paintNotifications({ ctx, area, lines, palette, fonts }: Painter) {
  const items = lines.filter((line) => line.trim())
  if (!items.length) return
  const gap = 28
  const cardH = Math.min(230, (area.h - gap * (items.length - 1)) / items.length)
  const total = items.length * cardH + gap * (items.length - 1)
  let y = area.y + Math.max(0, (area.h - total) / 2)
  items.forEach((item, index) => {
    const split = item.indexOf(':')
    const app = split > 0 ? item.slice(0, split).trim() : 'Reminder'
    const message = split > 0 ? item.slice(split + 1).trim() : item
    const x = area.x
    roundRect(ctx, x, y, area.w, cardH, 36)
    ctx.fillStyle = palette.alt
    ctx.fill()
    const d = Math.min(96, cardH - 48)
    ctx.fillStyle = index % 2 === 0 ? palette.accent : palette.buttonFill
    ctx.beginPath()
    ctx.arc(x + 36 + d / 2, y + cardH / 2, d / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.font = fonts.bodyBold(Math.round(d * 0.5))
    ctx.fillStyle = bestText(index % 2 === 0 ? palette.accent : palette.buttonFill)
    ctx.textAlign = 'center'
    ctx.fillText(app.slice(0, 1).toUpperCase(), x + 36 + d / 2, y + cardH / 2 - d * 0.27)
    const textX = x + 36 + d + 28
    const textW = area.w - (textX - x) - 36
    ctx.font = fonts.bodyBold(28)
    ctx.fillStyle = palette.muted
    ctx.textAlign = 'left'
    ctx.fillText(app.toUpperCase(), textX, y + 28)
    const block = textBlock(ctx, message, fonts.body, 40, 26, textW, 3, 1.25)
    drawLines(ctx, block, fonts.body, textX, y + 28 + 28 + 14, palette.text)
    y += cardH + gap
  })
}

function paintPost({ ctx, area, lines, palette, fonts }: Painter) {
  const handle = lines[0]?.trim() || '@handle'
  const text = lines[1] ?? ''
  const stats = lines[2]?.trim() ?? ''
  const pad = 44
  const cardH = Math.min(area.h, 860)
  const top = area.y + Math.max(0, (area.h - cardH) / 2)
  roundRect(ctx, area.x, top, area.w, cardH, 40)
  ctx.fillStyle = palette.alt
  ctx.fill()
  const d = 96
  ctx.fillStyle = palette.accent
  ctx.beginPath()
  ctx.arc(area.x + pad + d / 2, top + pad + d / 2, d / 2, 0, Math.PI * 2)
  ctx.fill()
  ctx.font = fonts.bodyBold(44)
  ctx.fillStyle = bestText(palette.accent)
  ctx.textAlign = 'center'
  ctx.fillText(
    handle.replace('@', '').slice(0, 1).toUpperCase() || 'A',
    area.x + pad + d / 2,
    top + pad + d / 2 - 24,
  )
  ctx.font = fonts.bodyBold(40)
  ctx.fillStyle = palette.text
  ctx.textAlign = 'left'
  ctx.fillText(handle, area.x + pad + d + 24, top + pad + 26)
  const block = textBlock(ctx, text, fonts.body, 58, 34, area.w - pad * 2, 9, 1.3)
  drawLines(ctx, block, fonts.body, area.x + pad, top + pad + d + 44, palette.text)
  if (stats) {
    const y = top + cardH - pad - 40
    ctx.strokeStyle = mix(palette.alt, palette.text, 0.18)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(area.x + pad, y - 28)
    ctx.lineTo(area.x + area.w - pad, y - 28)
    ctx.stroke()
    drawIcon(ctx, 'heart', area.x + pad + 20, y + 20, 44, palette.accent)
    ctx.font = fonts.body(34)
    ctx.fillStyle = palette.muted
    ctx.fillText(stats, area.x + pad + 58, y + 2)
  }
}

function paintBell({ ctx, area, lines, palette, fonts }: Painter) {
  const [left = '', mid = '', right = ''] = lines
  const baseY = area.y + area.h * 0.68
  const peakY = area.y + area.h * 0.28
  const cx = area.x + area.w / 2
  ctx.beginPath()
  for (let i = 0; i <= 60; i += 1) {
    const t = i / 60
    const x = area.x + t * area.w
    const g = Math.exp(-(((t - 0.5) / 0.17) ** 2) / 2)
    const y = baseY - g * (baseY - peakY)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.lineTo(area.x + area.w, baseY)
  ctx.lineTo(area.x, baseY)
  ctx.closePath()
  ctx.fillStyle = mix(palette.background, palette.accent, 0.25)
  ctx.fill()
  ctx.strokeStyle = palette.accent
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.strokeStyle = mix(palette.background, palette.text, 0.3)
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(area.x, baseY)
  ctx.lineTo(area.x + area.w, baseY)
  ctx.stroke()

  const tailW = area.w * 0.3
  const tailBlock = (text: string) => textBlock(ctx, text, fonts.bodyBold, 40, 26, tailW, 6, 1.2)
  const lb = tailBlock(left)
  const rb = tailBlock(right)
  drawLines(ctx, lb, fonts.bodyBold, area.x, baseY + 36, palette.text)
  drawLines(ctx, rb, fonts.bodyBold, area.x + area.w, baseY + 36, palette.text, 'right')
  const mb = textBlock(ctx, mid, fonts.head, 56, 32, area.w * 0.6, 4, 1.15)
  drawLines(ctx, mb, fonts.head, cx, peakY - mb.height - 24, palette.text, 'center')
}

function paintVenn({ ctx, area, lines, palette, fonts }: Painter) {
  const [a = '', b = '', both = ''] = lines
  const r = Math.min(area.w * 0.34, area.h * 0.34)
  const cy = area.y + area.h * 0.44
  const cx = area.x + area.w / 2
  const dx = r * 0.62
  ctx.save()
  ctx.globalAlpha = 0.55
  ctx.fillStyle = palette.accent
  ctx.beginPath()
  ctx.arc(cx - dx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = mix(palette.text, palette.background, 0.2)
  ctx.beginPath()
  ctx.arc(cx + dx, cy, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  const w = r * 0.9
  const ba = textBlock(ctx, a, fonts.bodyBold, 40, 24, w, 4, 1.15)
  const bb = textBlock(ctx, b, fonts.bodyBold, 40, 24, w, 4, 1.15)
  drawLines(ctx, ba, fonts.bodyBold, cx - dx - r * 0.35, cy - ba.height / 2, palette.text, 'center')
  drawLines(ctx, bb, fonts.bodyBold, cx + dx + r * 0.35, cy - bb.height / 2, palette.text, 'center')
  const bo = textBlock(ctx, both, fonts.head, 46, 26, area.w * 0.72, 3, 1.15)
  const py = cy + r + 56
  const pw = Math.min(area.w, Math.max(...bo.lines.map((l) => {
    ctx.font = fonts.head(bo.size)
    return ctx.measureText(l).width
  }), 0) + 80)
  roundRect(ctx, cx - pw / 2, py, pw, bo.height + 56, 40)
  ctx.fillStyle = palette.buttonFill
  ctx.fill()
  drawLines(ctx, bo, fonts.head, cx, py + 28, palette.buttonText, 'center')
}

function paintGrid({ ctx, area, lines, palette, fonts }: Painter) {
  const cells = lines.slice(0, 9)
  const gap = 18
  const cell = Math.min((area.w - gap * 2) / 3, (area.h - gap * 2) / 3)
  const gridW = cell * 3 + gap * 2
  const x0 = area.x + (area.w - gridW) / 2
  const y0 = area.y + (area.h - gridW) / 2
  cells.forEach((text, i) => {
    const col = i % 3
    const row = Math.floor(i / 3)
    const x = x0 + col * (cell + gap)
    const y = y0 + row * (cell + gap)
    const corner = (col === 0 || col === 2) && (row === 0 || row === 2)
    const centre = col === 1 && row === 1
    roundRect(ctx, x, y, cell, cell, 24)
    ctx.fillStyle = centre ? palette.buttonFill : corner ? mix(palette.alt, palette.accent, 0.25) : palette.alt
    ctx.fill()
    const color = centre ? palette.buttonText : palette.text
    const block = textBlock(ctx, text, fonts.bodyBold, 34, 18, cell - 36, 6, 1.18)
    drawLines(ctx, block, fonts.bodyBold, x + cell / 2, y + (cell - block.height) / 2, color, 'center')
  })
}

function painterFor(input: ImagePostInput): (p: Painter) => void {
  switch (input.formatId) {
    case 20:
      return paintNobody
    case 64:
      return paintNotifications
    case 71:
      return paintPost
    case 67:
      return paintBell
    case 68:
      return paintVenn
  }
  switch (input.layout) {
    case 'columns':
      return paintColumns
    case 'grid':
      return paintGrid
    case 'stack':
      return paintNobody
    default:
      return paintCard
  }
}

export interface ImagePostReport {
  background: string
  textColor: string
  hasLogo: boolean
}

/** Paints one branded single-image post (1080x1350 design space). */
export function paintImagePost(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  input: ImagePostInput,
  assets: BrandAssets,
  stock: CanvasImageSource | null,
): ImagePostReport {
  const width = CAROUSEL_WIDTH
  const height = CAROUSEL_HEIGHT
  const brand = assets.brand
  const style = getVisualStyle(brand.visualStyle).key
  const palette = paletteFor(brand, 'hook', 0, input.scheme)
  const headlineFont = getBrandFont(brand.headlineFont)
  const bodyFont = getBrandFont(brand.bodyFont)
  const headWeight = nearestWeight(headlineFont, style === 'bold-minimal' ? 800 : 600)
  const fonts: Fonts = {
    head: (size) => `${headWeight} ${size}px ${headlineFont.stack}`,
    body: (size) => `${nearestWeight(bodyFont, 400)} ${size}px ${bodyFont.stack}`,
    bodyBold: (size) => `${nearestWeight(bodyFont, 700)} ${size}px ${bodyFont.stack}`,
  }

  ctx.save()
  ctx.scale(canvasWidth / CAROUSEL_WIDTH, canvasHeight / CAROUSEL_HEIGHT)
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, width, height)

  const stockBand = stock ? 460 : 0
  if (stock) {
    coverDraw(ctx, stock as HTMLImageElement, 0, 0, width, stockBand)
    ctx.fillStyle = `${brand.colors.primary}88`
    ctx.fillRect(0, 0, width, stockBand)
  } else {
    const kind: DecorKind = 'orbs'
    drawDecor(ctx, kind, width, height, palette, input.formatId)
  }

  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const barH = 72
  const logoTop = brand.logoCorner.startsWith('top')
  const logoLeft = brand.logoCorner.endsWith('left')
  const topBarY = MARGIN
  const bottomBarY = height - MARGIN - barH
  const logoBarY = logoTop ? topBarY : bottomBarY
  const otherBarY = logoTop ? bottomBarY : topBarY

  const logo = brand.showLogo === false ? null : pickLogo(assets, palette.background)
  let hasLogo = false
  if (logo) {
    const box = { w: 220, h: barH }
    const x = logoLeft ? MARGIN : width - MARGIN - box.w
    containDraw(ctx, logo, x, logoBarY, box.w, box.h, logoLeft ? 'left' : 'right')
    hasLogo = true
  }

  const tag = TAGS[input.formatId] ?? input.formatName.toUpperCase()
  ctx.font = `${nearestWeight(bodyFont, 700)} 26px ${bodyFont.stack}`
  ctx.fillStyle = stock && otherBarY === topBarY ? '#ffffff' : palette.accentText
  ctx.textAlign = logoLeft ? 'right' : 'left'
  ctx.fillText(
    tag,
    logoLeft ? width - MARGIN : MARGIN,
    otherBarY + (barH - 26) / 2,
  )
  ctx.textAlign = 'left'

  const top = Math.max(topBarY + barH + 70, stockBand + 60)
  const bottom = bottomBarY - 40
  const area: Area = {
    x: MARGIN,
    y: top,
    w: width - MARGIN * 2,
    h: Math.max(200, bottom - top),
  }
  const lines = input.lines.map((line) => line.trim()).filter(Boolean)
  painterFor(input)({
    ctx,
    area,
    lines,
    palette,
    fonts,
    formatId: input.formatId,
  })
  ctx.restore()
  return {
    background: palette.background,
    textColor: palette.text,
    hasLogo,
  }
}
