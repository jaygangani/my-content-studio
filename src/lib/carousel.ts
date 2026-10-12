import { getBrandFont, getVisualStyle } from '@/lib/brand'
import {
  bestText,
  containDraw,
  contrastRatio,
  coverDraw,
  drawIcon,
  fitText,
  luminance,
  mix,
  nearestWeight,
  roundRect,
  wrap,
} from '@/lib/carouselKit'
import { LAYOUT_PAINTERS, paintLayoutUnderlay } from '@/lib/carouselLayouts'
import type { Brand } from '@/types/profile'
import type { CarouselSlide } from '@/types/script'

export interface BrandAssets {
  brand: Brand
  logoLight: HTMLImageElement | null
  logoDark: HTMLImageElement | null
  appLogo: HTMLImageElement | null
  screenshots: Record<string, HTMLImageElement>
  features: Array<{ id: string; name: string }>
}

export interface SlideReport {
  role: 'hook' | 'value' | 'cta'
  background: string
  textColor: string
  accentColor: string
  contrast: number
  headlineLines: number
  headlineSize: number
  bodyLines: number
  bodySize: number
  bodyClamped: boolean
  headlineClamped: boolean
  hasLogo: boolean
  stockOverlay: boolean
  visualType: string
}

export const CAROUSEL_WIDTH = 1080
export const CAROUSEL_HEIGHT = 1350
const MARGIN = 80

interface Palette {
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

/** A hue-preserving ramp step: 50 (lightest) to 900 (deepest), 500 is the input. */
export function tone(hex: string, step: number): string {
  if (step === 500) return hex
  if (step < 500) return mix(hex, '#ffffff', ((500 - step) / 500) * 0.92)
  return mix(hex, '#000000', ((step - 500) / 500) * 0.78)
}

function ensureDark(color: string): string {
  return luminance(color) > 0.16 ? mix(color, '#000000', 0.6) : color
}

function ensureLight(color: string): string {
  return luminance(color) < 0.6 ? mix(color, '#ffffff', 0.72) : color
}

export type HookCover =
  | 'classic'
  | 'centered'
  | 'bigtype'
  | 'framed'
  | 'split'
  | 'badge'
  | 'stripe'

export const HOOK_COVERS: HookCover[] = [
  'classic',
  'centered',
  'bigtype',
  'framed',
  'split',
  'badge',
  'stripe',
]

export type BackgroundScheme = 'dark' | 'light' | 'tinted' | 'bold'

export const BACKGROUND_SCHEMES: BackgroundScheme[] = ['dark', 'light', 'tinted', 'bold']

function paletteFor(
  brand: Brand,
  role: 'hook' | 'value' | 'cta',
  index: number,
  schemeInput?: string,
): Palette {
  const style = getVisualStyle(brand.visualStyle).key
  const { primary, secondary, accent } = brand.colors
  const dark = luminance(primary) <= luminance(secondary) ? primary : secondary
  const light = dark === primary ? secondary : primary
  const scheme: BackgroundScheme = BACKGROUND_SCHEMES.includes(
    schemeInput as BackgroundScheme,
  )
    ? (schemeInput as BackgroundScheme)
    : style === 'warm-editorial'
      ? 'light'
      : 'dark'

  const rotate = <T,>(options: T[], at: number): T =>
    options[((at % options.length) + options.length) % options.length]

  let background: string
  if (scheme === 'dark') {
    const options =
      style === 'tech-clean'
        ? ['#0b0b0c', mix('#0b0b0c', dark, 0.22), mix('#0b0b0c', accent, 0.12)]
        : [
            ensureDark(tone(dark, 900)),
            ensureDark(tone(dark, 800)),
            ensureDark(tone(primary, 900)),
            ensureDark(tone(secondary, 900)),
          ]
    background =
      role === 'hook'
        ? options[0]
        : role === 'cta'
          ? style === 'tech-clean'
            ? rotate(options, index + 2)
            : ensureDark(tone(accent, 800))
          : rotate(options.slice(1), index - 1)
  } else if (scheme === 'light') {
    const options = [
      ensureLight(tone(light, 50)),
      ensureLight(tone(accent, 50)),
      ensureLight(tone(primary, 100)),
      ensureLight(tone(secondary, 50)),
    ]
    background =
      role === 'hook'
        ? options[0]
        : role === 'cta'
          ? ensureLight(tone(accent, 100))
          : rotate(options.slice(1), index - 1)
  } else if (scheme === 'tinted') {
    const base = ensureLight(tone(light, 50))
    const options = [
      mix(base, accent, 0.12),
      mix(base, primary, 0.16),
      mix(base, secondary, 0.14),
    ]
    background =
      role === 'hook'
        ? mix(base, accent, 0.2)
        : role === 'cta'
          ? mix(base, accent, 0.3)
          : rotate(options, index - 1)
  } else {
    const options = [secondary, tone(primary, 700), tone(accent, 600)]
    background =
      role === 'hook'
        ? primary
        : role === 'cta'
          ? accent
          : rotate(options, index - 1)
  }

  const text = bestText(background)
  const accentOk = contrastRatio(background, accent) >= 3
  const accentFill = accentOk ? accent : text
  const decorBase = contrastRatio(background, accent) < 1.6 ? text : accent
  return {
    background,
    alt: mix(background, text, 0.1),
    text,
    accent,
    accentText: accentOk ? accent : text,
    muted: mix(text, background, 0.35),
    decor: mix(background, decorBase, 0.26),
    decorStrong: mix(background, decorBase, 0.5),
    buttonFill: accentFill,
    buttonText: bestText(accentFill),
  }
}

type DecorKind = 'blob' | 'rings' | 'dots' | 'stripes' | 'grid' | 'none'

function decorFor(
  style: string,
  role: 'hook' | 'value' | 'cta',
  index: number,
  visualType: string,
): DecorKind {
  if (visualType === 'stock' || visualType === 'screenshot') return 'none'
  if (style === 'tech-clean') return role === 'value' && index % 2 === 0 ? 'dots' : 'grid'
  if (style === 'warm-editorial') {
    if (role === 'hook') return 'rings'
    if (role === 'cta') return 'blob'
    return index % 2 === 0 ? 'dots' : 'none'
  }
  if (role === 'hook') return 'blob'
  if (role === 'cta') return 'rings'
  return index % 2 === 0 ? 'stripes' : 'dots'
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  kind: DecorKind,
  width: number,
  height: number,
  palette: Palette,
) {
  if (kind === 'none') return
  ctx.save()
  if (kind === 'blob') {
    ctx.fillStyle = palette.decor
    ctx.beginPath()
    ctx.arc(width - 40, 170, 360, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = palette.decorStrong
    ctx.beginPath()
    ctx.arc(width - 40, 170, 150, 0, Math.PI * 2)
    ctx.fill()
  } else if (kind === 'rings') {
    ctx.strokeStyle = palette.decor
    ctx.lineWidth = 8
    for (const r of [150, 250, 350]) {
      ctx.beginPath()
      ctx.arc(width - 20, height - 260, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  } else if (kind === 'dots') {
    ctx.fillStyle = palette.decor
    for (let row = 0; row < 5; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        ctx.beginPath()
        ctx.arc(width - MARGIN - col * 48 - 6, MARGIN + 140 + row * 48, 6, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  } else if (kind === 'stripes') {
    ctx.translate(width, height)
    ctx.rotate(-Math.PI / 4)
    ctx.fillStyle = palette.decor
    for (let i = 0; i < 4; i += 1) {
      ctx.fillRect(-60 - i * 110, -520, 56, 1040)
    }
  } else if (kind === 'grid') {
    ctx.strokeStyle = mix(palette.background, palette.text, 0.07)
    ctx.lineWidth = 2
    for (let x = MARGIN; x < width; x += 120) {
      ctx.beginPath()
      ctx.moveTo(x, MARGIN + 100)
      ctx.lineTo(x, height - MARGIN - 100)
      ctx.stroke()
    }
    for (let y = MARGIN + 100; y < height - MARGIN; y += 120) {
      ctx.beginPath()
      ctx.moveTo(MARGIN, y)
      ctx.lineTo(width - MARGIN, y)
      ctx.stroke()
    }
  }
  ctx.restore()
}

const KEYWORD_ICONS: Array<[RegExp, string]> = [
  [/\b(time|hour|minute|day|week|daily|schedule|deadline)\b/i, 'clock'],
  [/\b(idea|tip|learn|think|insight|smart)\b/i, 'bulb'],
  [/\b(stop|never|don't|mistake|avoid|wrong|myth)\b/i, 'x'],
  [/\b(goal|focus|aim|target|plan|result)\b/i, 'target'],
  [/\b(fast|quick|speed|power|boost|energy)\b/i, 'bolt'],
  [/\b(love|care|health|feel|kind)\b/i, 'heart'],
  [/\b(ask|talk|say|tell|share|friend|chat)\b/i, 'chat'],
  [/\b(best|top|win|great|proud)\b/i, 'star'],
]

function watermarkIcon(slide: CarouselSlide, index: number): string {
  if (slide.icon) return slide.icon
  const text = `${slide.headline} ${slide.body}`
  for (const [pattern, icon] of KEYWORD_ICONS) {
    if (pattern.test(text)) return icon
  }
  return (['bolt', 'target', 'bulb', 'star'] as const)[index % 4]
}

export const CAROUSEL_ICONS = [
  'check', 'x', 'arrow', 'bolt', 'star', 'clock', 'heart', 'target', 'bulb', 'chat',
] as const

function drawDevice(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  x: number,
  y: number,
  w: number,
  h: number,
  frame: string,
  screenBackground: string,
) {
  const radius = w * 0.14
  ctx.save()
  roundRect(ctx, x, y, w, h, radius)
  ctx.fillStyle = frame
  ctx.fill()
  const bezel = w * 0.035
  roundRect(ctx, x + bezel, y + bezel, w - bezel * 2, h - bezel * 2, radius - bezel)
  ctx.fillStyle = screenBackground
  ctx.fill()
  ctx.clip()
  if (image) {
    coverDraw(ctx, image, x + bezel, y + bezel, w - bezel * 2, h - bezel * 2)
  }
  ctx.restore()
  roundRect(ctx, x + w * 0.36, y + bezel * 1.6, w * 0.28, w * 0.045, w * 0.025)
  ctx.fillStyle = frame
  ctx.fill()
}

function pickLogo(
  assets: BrandAssets,
  background: string,
): HTMLImageElement | null {
  const darkBg = luminance(background) < 0.4
  const preferred = darkBg ? assets.logoDark : assets.logoLight
  const other = darkBg ? assets.logoLight : assets.logoDark
  return preferred ?? other ?? assets.appLogo
}

/** Paints one branded carousel slide and returns measurements for QA. */
export function paintCarouselSlide(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  slide: CarouselSlide,
  index: number,
  total: number,
  assets: BrandAssets,
  stock: CanvasImageSource | null,
  variant?: string,
  scheme?: string,
  hookCover?: string,
): SlideReport {
  const width = CAROUSEL_WIDTH
  const height = CAROUSEL_HEIGHT
  const brand = assets.brand
  const style = getVisualStyle(brand.visualStyle).key
  const role: 'hook' | 'value' | 'cta' =
    slide.role === 'hook' || slide.role === 'cta' || slide.role === 'value'
      ? slide.role
      : index === 0
        ? 'hook'
        : index === total - 1
          ? 'cta'
          : 'value'
  const visualType = slide.visual_type ?? 'typography'
  const palette = paletteFor(brand, role, index, scheme)
  const headlineFont = getBrandFont(brand.headlineFont)
  const bodyFont = getBrandFont(brand.bodyFont)
  const headlineWeight = nearestWeight(
    headlineFont,
    style === 'bold-minimal' ? 800 : style === 'warm-editorial' ? 600 : 600,
  )
  const bodyWeight = nearestWeight(bodyFont, 400)
  const headFont = (size: number) =>
    `${headlineWeight} ${size}px ${headlineFont.stack}`
  const bodyFontCss = (size: number) =>
    `${bodyWeight} ${size}px ${bodyFont.stack}`

  ctx.save()
  ctx.scale(canvasWidth / CAROUSEL_WIDTH, canvasHeight / CAROUSEL_HEIGHT)
  ctx.fillStyle = palette.background
  ctx.fillRect(0, 0, width, height)
  const cover: HookCover | null =
    role === 'hook' && visualType === 'typography'
      ? HOOK_COVERS.includes(hookCover as HookCover)
        ? (hookCover as HookCover)
        : 'classic'
      : null
  const centered = cover === 'centered' || cover === 'framed' || cover === 'badge'
  const textX = centered ? width / 2 : MARGIN
  const coverDecor: Record<HookCover, DecorKind | null> = {
    classic: null,
    centered: 'rings',
    bigtype: 'none',
    framed: 'none',
    split: 'none',
    badge: 'dots',
    stripe: 'stripes',
  }
  const customLayout =
    role === 'value' &&
    (visualType === 'typography' || (variant === 'stat' && visualType === 'data'))
      ? LAYOUT_PAINTERS[variant as keyof typeof LAYOUT_PAINTERS]
      : undefined
  if (customLayout) paintLayoutUnderlay(variant, ctx, width, height, palette)
  drawDecor(
    ctx,
    customLayout
      ? 'none'
      : (cover ? coverDecor[cover] : null) ??
        decorFor(style, role, index, visualType),
    width,
    height,
    palette,
  )
  if (
    !customLayout &&
    role === 'value' &&
    visualType === 'typography' &&
    index % 2 === 1
  ) {
    drawIcon(
      ctx,
      watermarkIcon(slide, index),
      width - MARGIN - 150,
      height - MARGIN - 330,
      380,
      mix(palette.background, palette.accent, 0.2),
    )
  }
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'

  const innerW = width - MARGIN * 2
  const logoTop = brand.logoCorner.startsWith('top')
  const logoLeft = brand.logoCorner.endsWith('left')
  const barH = 72
  const topBarY = MARGIN
  const bottomBarY = height - MARGIN - barH
  const logoBarY = logoTop ? topBarY : bottomBarY
  const otherBarY = logoTop ? bottomBarY : topBarY

  const logo = brand.showLogo === false ? null : pickLogo(assets, palette.background)
  const logoBox =
    role === 'cta'
      ? { w: 300, h: 110 }
      : { w: 220, h: barH }
  let hasLogo = false
  if (logo) {
    const x = role === 'cta' ? (width - logoBox.w) / 2 : logoLeft ? MARGIN : width - MARGIN - logoBox.w
    const y = role === 'cta' ? height - MARGIN - logoBox.h : logoBarY + (barH - logoBox.h) / 2
    containDraw(ctx, logo, x, y, logoBox.w, logoBox.h, role === 'cta' ? 'center' : logoLeft ? 'left' : 'right')
    hasLogo = true
  }

  if (role === 'hook' && total > 1) {
    ctx.font = `${nearestWeight(bodyFont, 600)} 30px ${bodyFont.stack}`
    ctx.fillStyle = palette.accentText
    const cue = 'Swipe →'
    const w = ctx.measureText(cue).width
    const x = centered ? (width - w) / 2 : logoLeft ? MARGIN : width - MARGIN - w
    ctx.fillText(cue, x, otherBarY + (barH - 30) / 2)
  }

  if (style === 'tech-clean') {
    ctx.strokeStyle = mix(palette.background, palette.text, 0.14)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(MARGIN, topBarY + barH + 24)
    ctx.lineTo(width - MARGIN, topBarY + barH + 24)
    ctx.stroke()
    ctx.font = `${nearestWeight(bodyFont, 600)} 24px ${bodyFont.stack}`
    ctx.fillStyle = palette.accentText
    const tag = (role === 'cta' ? 'NEXT STEP' : role === 'hook' ? 'START' : `STEP ${index}`).toUpperCase()
    ctx.fillText(tag, MARGIN, topBarY + barH + 48)
  }

  const contentTop = topBarY + barH + 110
  const contentBottom = bottomBarY - 24
  let y = contentTop
  let stockOverlay = false

  if (customLayout) {
    const laid = customLayout({
      ctx,
      width,
      height,
      margin: MARGIN,
      top: contentTop,
      bottom: contentBottom,
      slide,
      index,
      total,
      palette,
      headFont,
      bodyFont: bodyFontCss,
    })
    ctx.restore()
    return {
      role,
      background: palette.background,
      textColor: palette.text,
      accentColor: palette.accent,
      contrast: contrastRatio(palette.background, palette.text),
      ...laid,
      hasLogo,
      stockOverlay: false,
      visualType,
    }
  }

  const mediaTop = contentTop - 30
  if (visualType === 'screenshot') {
    const screenshot = assets.screenshots[slide.visual] ?? null
    const dh = 640
    const dw = Math.round(dh * 0.5)
    drawDevice(
      ctx,
      screenshot,
      (width - dw) / 2,
      mediaTop,
      dw,
      dh,
      palette.text,
      palette.alt,
    )
    y = mediaTop + dh + 40
  } else if (visualType === 'stock' && stock) {
    const ih = 520
    coverDraw(ctx, stock as HTMLImageElement, 0, mediaTop - 30, width, ih)
    ctx.fillStyle = `${brand.colors.primary}99`
    ctx.fillRect(0, mediaTop - 30, width, ih)
    stockOverlay = true
    y = mediaTop - 30 + ih + 48
  } else if (visualType === 'icon') {
    const d = 190
    ctx.fillStyle = palette.accent
    ctx.beginPath()
    ctx.arc(MARGIN + d / 2, y + d / 2, d / 2, 0, Math.PI * 2)
    ctx.fill()
    const onAccent = bestText(palette.accent)
    drawIcon(ctx, slide.icon || 'check', MARGIN + d / 2, y + d / 2, d * 0.55, onAccent)
    y += d + 56
  } else if (visualType === 'data' && slide.stat_value) {
    const fit = fitText(ctx, slide.stat_value, headFont, 220, 96, innerW, 1)
    ctx.font = headFont(fit.size)
    ctx.fillStyle = palette.accentText
    ctx.fillText(fit.lines[0], MARGIN, y)
    y += fit.size * 1.05
    if (slide.stat_label) {
      ctx.font = bodyFontCss(40)
      ctx.fillStyle = palette.muted
      const labelLines = wrap(ctx, slide.stat_label, innerW).slice(0, 2)
      labelLines.forEach((line, i) => ctx.fillText(line, MARGIN, y + i * 52))
      y += labelLines.length * 52
    }
    y += 40
  }

  const headSizeStart =
    cover === 'bigtype'
      ? 150
      : role === 'hook'
        ? 112
        : visualType === 'typography'
          ? 92
          : 68
  const headMaxLines =
    cover === 'bigtype' ? 6 : role === 'hook' ? 5 : visualType === 'typography' ? 4 : 3
  ctx.textAlign = centered ? 'center' : 'left'

  const headline = fitText(
    ctx,
    slide.headline,
    headFont,
    headSizeStart,
    52,
    innerW,
    headMaxLines,
  )
  const bodyBlock = slide.body.trim()
    ? fitText(ctx, slide.body, bodyFontCss, 42, 34, innerW, 3)
    : { lines: [] as string[], size: 0, clamped: false }
  const headH = headline.lines.length * headline.size * 1.1
  const bodyH = bodyBlock.lines.length * bodyBlock.size * 1.38
  const gap = bodyBlock.lines.length ? 36 : 0
  const blockH = headH + gap + bodyH

  if (visualType === 'typography' || visualType === 'icon' || visualType === 'data') {
    const area = contentBottom - y
    if (visualType === 'typography') {
      y = Math.max(contentTop, y + (area - blockH) / 2 - 10)
    }
  }

  if (cover === 'bigtype') {
    y = Math.max(contentTop, contentBottom - blockH - 20)
  }
  if (cover === 'framed') {
    ctx.strokeStyle = palette.decorStrong
    ctx.lineWidth = 4
    ctx.strokeRect(MARGIN - 24, contentTop - 40, innerW + 48, contentBottom - contentTop + 20)
    ctx.fillStyle = palette.accent
    for (const [cx, cy] of [
      [MARGIN - 24, contentTop - 40],
      [MARGIN + innerW + 24, contentTop - 40],
      [MARGIN - 24, contentBottom - 20],
      [MARGIN + innerW + 24, contentBottom - 20],
    ]) {
      ctx.fillRect(cx - 12, cy - 12, 24, 24)
    }
  }
  if (cover === 'split') {
    const blockTop = contentTop - 40
    const blockHeight = 340
    ctx.fillStyle = palette.accent
    ctx.fillRect(0, blockTop, width, blockHeight)
    drawIcon(
      ctx,
      watermarkIcon(slide, 0),
      width / 2,
      blockTop + blockHeight / 2,
      200,
      bestText(palette.accent),
    )
    y = blockTop + blockHeight + 56
  }
  if (cover === 'badge') {
    const d = 200
    ctx.fillStyle = palette.accent
    ctx.beginPath()
    ctx.arc(width / 2, y + d / 2, d / 2, 0, Math.PI * 2)
    ctx.fill()
    drawIcon(ctx, watermarkIcon(slide, 0), width / 2, y + d / 2, d * 0.55, bestText(palette.accent))
    y += d + 56
  }
  if (cover === 'stripe') {
    ctx.save()
    ctx.fillStyle = palette.decor
    ctx.translate(width / 2, y + blockH / 2)
    ctx.rotate(-0.08)
    ctx.fillRect(-width, -blockH / 2 - 40, width * 2, blockH + 80)
    ctx.restore()
  }

  if (role === 'value' && variant === 'steps' && visualType === 'typography') {
    ctx.font = headFont(120)
    ctx.fillStyle = palette.accentText
    ctx.fillText(String(index).padStart(2, '0'), MARGIN, y)
    y += 120 * 0.95 + 28
  }
  if (role === 'value' && variant === 'checklist' && visualType === 'typography') {
    roundRect(ctx, MARGIN, y, 64, 64, 16)
    ctx.fillStyle = palette.accent
    ctx.fill()
    drawIcon(ctx, 'check', MARGIN + 32, y + 32, 40, bestText(palette.accent))
    y += 64 + 36
  }

  if (style === 'warm-editorial' || style === 'bold-minimal') {
    ctx.fillStyle = palette.accent
    const barW = role === 'hook' ? 160 : 96
    ctx.fillRect(
      centered ? width / 2 - barW / 2 : MARGIN,
      y - 34,
      barW,
      style === 'bold-minimal' ? 12 : 4,
    )
  }

  ctx.font = headFont(headline.size)
  ctx.fillStyle = palette.text
  headline.lines.forEach((line, i) => {
    ctx.fillText(line, textX, y + i * headline.size * 1.1)
  })
  y += headH + gap

  if (bodyBlock.lines.length) {
    ctx.font = bodyFontCss(bodyBlock.size)
    ctx.fillStyle = mix(palette.text, palette.background, 0.12)
    bodyBlock.lines.forEach((line, i) => {
      ctx.fillText(line, textX, y + i * bodyBlock.size * 1.38)
    })
    y += bodyH
  }

  if (role === 'cta') {
    const by = Math.min(y + 56, contentBottom - 150)
    const label = 'Save for later'
    ctx.font = `${nearestWeight(bodyFont, 600)} 36px ${bodyFont.stack}`
    const pw = ctx.measureText(label).width + 72
    roundRect(ctx, MARGIN, by, pw, 84, 42)
    ctx.fillStyle = palette.buttonFill
    ctx.fill()
    ctx.fillStyle = palette.buttonText
    ctx.fillText(label, MARGIN + 36, by + 24)
  }

  ctx.restore()

  return {
    role,
    background: palette.background,
    textColor: palette.text,
    accentColor: palette.accent,
    contrast: contrastRatio(palette.background, palette.text),
    headlineLines: headline.lines.length,
    headlineSize: headline.size,
    bodyLines: bodyBlock.lines.length,
    bodySize: bodyBlock.size,
    bodyClamped: bodyBlock.clamped,
    headlineClamped: headline.clamped,
    hasLogo,
    stockOverlay,
    visualType,
  }
}
