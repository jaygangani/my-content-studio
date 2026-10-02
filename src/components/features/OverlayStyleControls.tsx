import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { AlignCenter, AlignLeft, AlignRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ensureOverlayFontCss, overlayFontStack } from '@/lib/overlayText'
import { cn } from '@/lib/utils'
import {
  isDefaultOverlayStyle,
  OVERLAY_ALIGNS,
  OVERLAY_BACKDROPS,
  OVERLAY_BACKDROP_COLORS,
  OVERLAY_FONTS,
  OVERLAY_OPACITIES,
  OVERLAY_SIZES,
  OVERLAY_TEXT_COLORS,
  OVERLAY_TRACKING,
  OVERLAY_WEIGHTS,
} from '@/types/content'
import type { OverlayTextStyle } from '@/types/content'

interface OverlayStyleControlsProps {
  style: OverlayTextStyle
  onChange: (patch: Partial<OverlayTextStyle>) => void
  onApplyToAll: () => void
  onReset: () => void
}

const ALIGN_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
} as const

function chipClass(active: boolean) {
  return cn(
    'rounded-full px-2.5 py-0.5 text-[11px] transition-colors',
    active
      ? 'bg-ink text-white'
      : 'border border-hairline text-graphite hover:border-ink hover:text-ink',
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
      <span className="micro-caps w-16 shrink-0 text-slate">{label}</span>
      {children}
    </div>
  )
}

/** Per-segment overlay typography + backdrop controls. */
export function OverlayStyleControls({
  style,
  onChange,
  onApplyToAll,
  onReset,
}: OverlayStyleControlsProps) {
  useEffect(() => {
    if (style.font === 'geist') return
    void ensureOverlayFontCss()
  }, [style.font])

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="micro-caps text-slate">text style</p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onApplyToAll}
            className="h-7 rounded-full px-3 text-[11px]"
          >
            Apply to all
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onReset}
            disabled={isDefaultOverlayStyle(style)}
            className="h-7 rounded-full px-3 text-[11px]"
          >
            <RotateCcw className="size-3" /> Reset
          </Button>
        </div>
      </div>

      <Group label="Font">
        {OVERLAY_FONTS.map((font) => (
          <button
            key={font.key}
            type="button"
            aria-pressed={style.font === font.key}
            onClick={() => onChange({ font: font.key })}
            className={chipClass(style.font === font.key)}
            style={{ fontFamily: overlayFontStack(font.key) }}
          >
            {font.label}
          </button>
        ))}
      </Group>

      <Group label="Size">
        {OVERLAY_SIZES.map((size) => (
          <button
            key={size.key}
            type="button"
            aria-pressed={style.size === size.key}
            onClick={() => onChange({ size: size.key })}
            className={chipClass(style.size === size.key)}
          >
            {size.label}
          </button>
        ))}
      </Group>

      <Group label="Weight">
        {OVERLAY_WEIGHTS.map((weight) => (
          <button
            key={weight}
            type="button"
            aria-pressed={style.weight === weight}
            onClick={() => onChange({ weight })}
            className={cn(chipClass(style.weight === weight), 'font-medium')}
            style={{ fontWeight: weight }}
          >
            {weight}
          </button>
        ))}
      </Group>

      <Group label="Colour">
        {OVERLAY_TEXT_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={style.text_color === color.value}
            onClick={() => onChange({ text_color: color.value })}
            className={cn(
              'size-5 rounded-full border',
              style.text_color === color.value
                ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-canvas'
                : 'border-hairline-soft hover:border-ink',
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </Group>

      <Group label="Case">
        <button
          type="button"
          aria-pressed={style.uppercase}
          onClick={() => onChange({ uppercase: !style.uppercase })}
          className={chipClass(style.uppercase)}
        >
          Uppercase
        </button>
        <button
          type="button"
          aria-pressed={style.italic}
          onClick={() => onChange({ italic: !style.italic })}
          className={cn(chipClass(style.italic), 'italic')}
        >
          Italic
        </button>
        {OVERLAY_TRACKING.map((tracking) => (
          <button
            key={tracking.key}
            type="button"
            aria-pressed={style.tracking === tracking.key}
            onClick={() => onChange({ tracking: tracking.key })}
            className={chipClass(style.tracking === tracking.key)}
            style={{ letterSpacing: `${tracking.em}em` }}
          >
            {tracking.label}
          </button>
        ))}
      </Group>

      <Group label="Align">
        {OVERLAY_ALIGNS.map((align) => {
          const Icon = ALIGN_ICONS[align]
          return (
            <button
              key={align}
              type="button"
              title={`Align ${align}`}
              aria-label={`Align ${align}`}
              aria-pressed={style.align === align}
              onClick={() => onChange({ align })}
              className={cn(
                'flex size-7 items-center justify-center rounded-full transition-colors',
                style.align === align
                  ? 'bg-ink text-white'
                  : 'border border-hairline text-graphite hover:border-ink hover:text-ink',
              )}
            >
              <Icon className="size-3.5" />
            </button>
          )
        })}
      </Group>

      <Group label="Backdrop">
        {OVERLAY_BACKDROPS.map((backdrop) => (
          <button
            key={backdrop.key}
            type="button"
            aria-pressed={style.backdrop === backdrop.key}
            onClick={() => onChange({ backdrop: backdrop.key })}
            className={chipClass(style.backdrop === backdrop.key)}
          >
            {backdrop.label}
          </button>
        ))}
        {OVERLAY_BACKDROP_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            title={`${color.label} backdrop`}
            aria-label={`${color.label} backdrop`}
            disabled={style.backdrop === 'none'}
            aria-pressed={style.backdrop_color === color.value}
            onClick={() => onChange({ backdrop_color: color.value })}
            className={cn(
              'size-5 rounded-full border',
              style.backdrop_color === color.value
                ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-canvas'
                : 'border-hairline-soft hover:border-ink',
              style.backdrop === 'none' && 'opacity-30',
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </Group>

      <Group label="Opacity">
        {OVERLAY_OPACITIES.map((opacity) => (
          <button
            key={opacity}
            type="button"
            disabled={style.backdrop === 'none'}
            aria-pressed={style.backdrop_opacity === opacity}
            onClick={() => onChange({ backdrop_opacity: opacity })}
            className={cn(chipClass(style.backdrop_opacity === opacity), 'w-10')}
          >
            {Math.round(opacity * 100)}%
          </button>
        ))}
      </Group>
    </div>
  )
}
