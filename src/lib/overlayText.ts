import type { CSSProperties } from 'react'
import {
  DEFAULT_OVERLAY_STYLE,
  OVERLAY_ALIGNS,
  OVERLAY_BACKDROP_COLORS,
  OVERLAY_FONTS,
  OVERLAY_SIZES,
  OVERLAY_TEXT_COLORS,
  OVERLAY_TRACKING,
  type OverlayAlign,
  type OverlayFontKey,
  type OverlaySegment,
  type OverlaySize,
  type OverlayTextStyle,
  type OverlayTracking,
} from '@/types/content'

/**
 * Overlay text rendering. The DOM preview (`overlayTextCss`) and the canvas
 * burn-in (`drawOverlay`) read the same style object, so what you see while
 * editing is what lands in the rendered file.
 */

const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Anton&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Playfair+Display:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap'

/** Bare CSS font family name (no quotes, no fallbacks) for a catalog font. */
export function overlayFontFamily(font: OverlayFontKey): string {
  const entry = OVERLAY_FONTS.find((item) => item.key === font)
  return (
    entry?.stack
      .split(',')[0]
      .replace(/["']/g, '')
      .trim() ?? 'Geist Variable'
  )
}

/** Full CSS font stack (family + fallbacks) for a catalog font. */
export function overlayFontStack(font: OverlayFontKey): string {
  return (
    OVERLAY_FONTS.find((entry) => entry.key === font)?.stack ??
    OVERLAY_FONTS[0].stack
  )
}

export function overlaySizeScale(size: OverlaySize): number {
  return OVERLAY_SIZES.find((entry) => entry.key === size)?.scale ?? 0.055
}

export function overlayTrackingEm(tracking: OverlayTracking): number {
  return OVERLAY_TRACKING.find((entry) => entry.key === tracking)?.em ?? 0
}

export function overlayTextColorHex(style: OverlayTextStyle): string {
  return (
    OVERLAY_TEXT_COLORS.find((entry) => entry.value === style.text_color)?.value ??
    DEFAULT_OVERLAY_STYLE.text_color
  )
}

export function overlayBackdropColorHex(style: OverlayTextStyle): string {
  return (
    OVERLAY_BACKDROP_COLORS.find((entry) => entry.value === style.backdrop_color)
      ?.value ?? DEFAULT_OVERLAY_STYLE.backdrop_color
  )
}

/** Converts `#rrggbb` + alpha into a CSS `rgba()` string. */
function rgba(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const full =
    value.length === 3
      ? value
          .split('')
          .map((char) => char + char)
          .join('')
      : value
  const int = Number.parseInt(full, 16)
  if (Number.isNaN(int)) return hex
  return `rgba(${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}, ${alpha})`
}

export function overlayFontShorthand(
  style: OverlayTextStyle,
  fontSize: number,
): string {
  return `${style.italic ? 'italic ' : ''}${style.weight} ${fontSize}px ${overlayFontStack(style.font)}`
}

/**
 * Inline styles for the DOM preview caption. Sizes use `cqw` so they track the
 * 9:16 stage width exactly like the canvas percentages do.
 */
export function overlayTextCss(style: OverlayTextStyle): CSSProperties {
  const blocked = style.align !== 'center'
  return {
    fontFamily: overlayFontStack(style.font),
    fontWeight: style.weight,
    fontStyle: style.italic ? 'italic' : 'normal',
    fontSize: `${(overlaySizeScale(style.size) * 100).toFixed(3)}cqw`,
    lineHeight: 1.28,
    letterSpacing: `${overlayTrackingEm(style.tracking)}em`,
    textTransform: style.uppercase ? 'uppercase' : 'none',
    textAlign: style.align,
    color: overlayTextColorHex(style),
    backgroundColor:
      style.backdrop === 'none'
        ? 'transparent'
        : rgba(overlayBackdropColorHex(style), style.backdrop_opacity),
    borderRadius: style.backdrop === 'pill' ? '999px' : '2cqw',
    padding: '0.55em 0.75em',
    width: blocked ? '85cqw' : 'fit-content',
    maxWidth: '85cqw',
    marginInline: 'auto',
  }
}

export interface OverlayAlignment {
  vertical: 'top' | 'center' | 'bottom'
  horizontal: 'left' | 'center' | 'right'
}

/** Maps the free-text `screen_position` onto flex/canvas alignment. */
export function overlayAlignment(position: string): OverlayAlignment {
  const value = position.toLowerCase()
  return {
    vertical: value.includes('top')
      ? 'top'
      : value.includes('bottom')
        ? 'bottom'
        : 'center',
    horizontal: (OVERLAY_ALIGNS as readonly string[]).includes(value)
      ? (value as OverlayAlign)
      : value.includes('left')
        ? 'left'
        : value.includes('right')
          ? 'right'
          : 'center',
  }
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const lines: string[] = []
  let current = ''
  for (const word of text.split(/\s+/)) {
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

/** Burns one styled caption frame into the 9:16 export canvas. */
export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  segment: OverlaySegment,
  width: number,
  height: number,
) {
  const style = segment.style ?? DEFAULT_OVERLAY_STYLE
  const fontSize = Math.round(width * overlaySizeScale(style.size))
  const lineHeight = Math.round(fontSize * 1.28)
  const maxTextWidth = width * 0.82
  const padX = Math.round(fontSize * 0.75)
  const padY = Math.round(fontSize * 0.55)

  ctx.font = overlayFontShorthand(style, fontSize)
  if ('letterSpacing' in ctx) {
    ctx.letterSpacing = `${overlayTrackingEm(style.tracking)}em`
  }
  ctx.textBaseline = 'top'
  ctx.textAlign = style.align

  const content = style.uppercase ? segment.text.toUpperCase() : segment.text
  const lines = wrapLines(ctx, content, maxTextWidth)
  const widest = lines.reduce(
    (max, line) => Math.max(max, ctx.measureText(line).width),
    0,
  )
  const blocked = style.align !== 'center'
  const maxBoxWidth = width - width * 0.06
  const boxWidth = Math.min(
    blocked ? maxTextWidth + padX * 2 : widest + padX * 2,
    maxBoxWidth,
  )
  const boxHeight = lines.length * lineHeight + padY * 2 - (lineHeight - fontSize)

  const { vertical, horizontal } = overlayAlignment(segment.screen_position)
  const y =
    vertical === 'top'
      ? height * 0.12
      : vertical === 'bottom'
        ? height - boxHeight - height * 0.16
        : (height - boxHeight) / 2
  const x =
    horizontal === 'left'
      ? width * 0.06
      : horizontal === 'right'
        ? width - boxWidth - width * 0.06
        : (width - boxWidth) / 2

  if (style.backdrop !== 'none') {
    ctx.globalAlpha = style.backdrop_opacity
    ctx.fillStyle = overlayBackdropColorHex(style)
    ctx.beginPath()
    ctx.roundRect(
      x,
      y,
      boxWidth,
      boxHeight,
      style.backdrop === 'pill'
        ? boxHeight / 2
        : Math.round(width * 0.02),
    )
    ctx.fill()
    ctx.globalAlpha = 1
  }

  ctx.fillStyle = overlayTextColorHex(style)
  const textX =
    style.align === 'left'
      ? x + padX
      : style.align === 'right'
        ? x + boxWidth - padX
        : x + boxWidth / 2
  lines.forEach((line, index) => {
    ctx.fillText(line, textX, y + padY + index * lineHeight)
  })
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px'
}

let fontCssPromise: Promise<void> | null = null

/** Injects the Google Fonts stylesheet once, on demand. */
export function ensureOverlayFontCss(): Promise<void> {
  if (fontCssPromise) return fontCssPromise
  fontCssPromise = new Promise<void>((resolve) => {
    if (typeof document === 'undefined') return resolve()
    const settle = () => resolve()
    const existing = document.querySelector<HTMLLinkElement>(
      'link[data-overlay-fonts]',
    )
    if (existing) {
      if (existing.sheet) return settle()
      existing.addEventListener('load', settle, { once: true })
      existing.addEventListener('error', settle, { once: true })
      return
    }
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = GOOGLE_FONTS_HREF
    link.dataset.overlayFonts = 'true'
    link.addEventListener('load', settle, { once: true })
    link.addEventListener('error', settle, { once: true })
    document.head.appendChild(link)
  })
  return fontCssPromise
}

/**
 * Loads every font/weight the segments need before a render starts, so the
 * canvas never draws a fallback face mid-export. Missing fonts resolve empty
 * and fall back through the catalog stack.
 */
export async function ensureOverlayFonts(
  styles: readonly OverlayTextStyle[],
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return
  await ensureOverlayFontCss()
  const loads = new Map<string, Promise<unknown>>()
  for (const style of styles) {
    const key = `${style.font}:${style.weight}:${style.italic}`
    if (loads.has(key)) continue
    const shorthand = `${style.italic ? 'italic ' : ''}${style.weight} 72px "${overlayFontFamily(style.font)}"`
    loads.set(
      key,
      document.fonts.load(shorthand).catch(() => []),
    )
  }
  await Promise.all(loads.values())
  await document.fonts.ready
}
