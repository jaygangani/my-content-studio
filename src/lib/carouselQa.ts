import { paintCarouselSlide } from '@/lib/carousel'
import type { BrandAssets, SlideReport } from '@/lib/carousel'
import type { PieceScript } from '@/types/script'

export interface QaCheck {
  id: string
  label: string
  pass: boolean
  detail: string
}

const CTA_PHRASES =
  /\b(save this|save for later|follow (us|me|for)|comment [A-Z]{3,}|link in bio|dm me|share this)\b/i

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/** Paints every slide off-screen and checks the guide's quality list. */
export function runCarouselQa(
  script: PieceScript,
  assets: BrandAssets,
): QaCheck[] {
  if (script.schema !== 'CAROUSEL') return []
  const slides = script.payload.slides
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1350
  const ctx = canvas.getContext('2d')
  if (!ctx) return []

  const reports: SlideReport[] = slides.map((slide, index) =>
    paintCarouselSlide(
      ctx,
      1080,
      1350,
      slide,
      index,
      slides.length,
      assets,
      null,
      script.variant,
      script.bgScheme,
      script.hookCover,
    ),
  )

  const minContrast = Math.min(...reports.map((r) => r.contrast))
  const minBody = Math.min(
    ...reports.filter((r) => r.bodyLines > 0).map((r) => r.bodySize),
    99,
  )
  const clamped = reports
    .map((r, i) => (r.bodyClamped || r.headlineClamped ? i + 1 : 0))
    .filter(Boolean)
  const first = slides[0]
  const last = slides[slides.length - 1]
  const stray = slides
    .slice(0, -1)
    .map((s, i) => (CTA_PHRASES.test(`${s.headline} ${s.body}`) ? i + 1 : 0))
    .filter(Boolean)
  const stock = slides.filter((s) => s.visual_type === 'stock')
  const brand = assets.brand
  const noLogoSlides = reports.filter((r) => !r.hasLogo).length

  return [
    {
      id: 'brand',
      label: 'Only brand colours and approved fonts',
      pass: Boolean(
        brand.colors.primary &&
          brand.colors.secondary &&
          brand.colors.accent &&
          brand.headlineFont &&
          brand.bodyFont,
      ),
      detail: 'Slides draw from the brand kit only.',
    },
    {
      id: 'logo',
      label: 'Logo (optional)',
      pass: true,
      detail:
        brand.showLogo === false
          ? 'Hidden in the brand kit.'
          : noLogoSlides === reports.length
            ? 'No logo set, so slides run without one.'
            : 'Placed in the brand corner.',
    },
    {
      id: 'contrast',
      label: 'Text contrast at least 4.5:1',
      pass: minContrast >= 4.5,
      detail: `Lowest ratio ${minContrast.toFixed(1)}:1.`,
    },
    {
      id: 'legible',
      label: 'Readable on a phone',
      pass: minBody >= 36 && clamped.length === 0,
      detail: clamped.length
        ? `Text is cut on slide ${clamped.join(', ')}. Shorten it.`
        : `Smallest body text ${minBody}px at 1080 wide.`,
    },
    {
      id: 'hook',
      label: 'Slide 1 works as a hook',
      pass:
        Boolean(first?.headline.trim()) &&
        words(first?.headline ?? '') <= 7 &&
        (first?.role === 'hook' || slides.length === 1),
      detail: 'Short headline and a swipe cue.',
    },
    {
      id: 'cta',
      label: 'One call to action, on the last slide',
      pass: last?.role === 'cta' && stray.length === 0,
      detail: stray.length
        ? `Call to action wording on slide ${stray.join(', ')}.`
        : 'Last slide only.',
    },
    {
      id: 'stock',
      label: 'Stock photo only if the format allows, with brand overlay',
      pass:
        stock.length <= 1 &&
        (script.stockPolicy !== 'never' || stock.length === 0) &&
        reports.every((r) => r.visualType !== 'stock' || r.stockOverlay),
      detail:
        script.stockPolicy === 'never' && stock.length
          ? 'This format does not use stock photos.'
          : stock.length
            ? `${stock.length} stock slide(s).`
            : 'No stock photos.',
    },
  ]
}
