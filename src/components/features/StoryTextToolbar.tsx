import { useEffect, useState } from 'react'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  RotateCcw,
  Shuffle,
  Type,
} from 'lucide-react'
import { ensureOverlayFontCss, overlayFontStack } from '@/lib/overlayText'
import {
  TEXT_STYLE_PRESETS,
  getTextStylePreset,
  mergeOverrides,
  resolveTextStyle,
} from '@/lib/textStyles'
import { cn } from '@/lib/utils'
import {
  OVERLAY_FONTS,
  OVERLAY_SIZES,
  OVERLAY_TEXT_COLORS,
} from '@/types/content'
import type { OverlayTextStyle } from '@/types/content'
import type { PieceScript, TextOverride, TextRole } from '@/types/script'

export type EditScope = 'frame' | 'all'

interface StoryTextToolbarProps {
  script: PieceScript
  role: TextRole
  onRoleChange: (role: TextRole) => void
  onChange: (script: PieceScript) => void
  scope: EditScope
  onScopeChange: (scope: EditScope) => void
  frameIndex: number
  frameCount: number
  /** One-role pieces (meme reels): looks, colour, alignment, size only. */
  compact?: boolean
}

const FRAME_WORD: Record<PieceScript['schema'], string> = {
  REEL: 'beat',
  CAROUSEL: 'slide',
  IMAGE: 'image',
  STORY: 'frame',
}

const ROLES: Array<{ key: TextRole; label: string }> = [
  { key: 'hook', label: 'First line' },
  { key: 'body', label: 'Middle lines' },
  { key: 'cta', label: 'Last line' },
]

type Background = 'none' | 'dark' | 'light' | 'accent'

const ACCENT_BOX = '#ffd60a'

const SINGLE_WEIGHT_FONTS = ['anton', 'bebas', 'bangers', 'archivoblack', 'marker']
const CAPS_FONTS = ['anton', 'bebas', 'bangers', 'grotesk']
const STROKE_NEXT = { none: 'thin', thin: 'bold', bold: 'none' } as const
const STROKE_LABEL = { none: 'No outline', thin: 'Thin outline', bold: 'Bold outline' } as const

type Aspect = 'font' | 'colour' | 'box' | 'size' | 'case' | 'position'

const ASPECTS: Array<{ key: Aspect; label: string }> = [
  { key: 'font', label: 'Font' },
  { key: 'colour', label: 'Colour' },
  { key: 'box', label: 'Box' },
  { key: 'size', label: 'Size' },
  { key: 'case', label: 'Case' },
  { key: 'position', label: 'Position' },
]

const DEFAULT_ASPECTS: Aspect[] = ['font', 'colour', 'box', 'size', 'case']

const LIGHT_TEXT = ['#ffffff', '#f2efe9', '#ffd60a', '#f59e0b', '#38bdf8', '#ff4f9a', '#a3e635']
const SERIF_FONTS = ['playfair', 'instrument']
const ROLE_SIZES: Record<TextRole, Array<'sm' | 'md' | 'lg' | 'xl'>> = {
  hook: ['md', 'lg', 'xl'],
  body: ['sm', 'md', 'lg'],
  cta: ['sm', 'md'],
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

/**
 * One random but readable combination. Font, colour scheme and box are shared
 * across roles so the piece stays cohesive; sizes differ per role.
 */
function randomCombo(aspects: Aspect[]): Record<TextRole, TextOverride> {
  const font = pick(OVERLAY_FONTS)
  const singleWeight = SINGLE_WEIGHT_FONTS.includes(font.key)
  const weight = singleWeight ? 400 : pick([600, 700, 800, 900] as const)
  const box = pick(['none', 'none', 'dark', 'light', 'pill-amber'] as const)
  const textColor =
    box === 'light' || box === 'pill-amber'
      ? '#030303'
      : pick(LIGHT_TEXT)
  const stroke = box === 'none' ? pick(['bold', 'thin', 'none'] as const) : 'none'
  const uppercase = CAPS_FONTS.includes(font.key) ? true : Math.random() < 0.25
  const italic = SERIF_FONTS.includes(font.key) && Math.random() < 0.5
  const vertical = pick(['top', 'center', 'bottom'] as const)
  const horizontal = pick(['center', 'center', 'left'] as const)
  const has = (key: Aspect) => aspects.includes(key)

  const make = (role: TextRole): TextOverride => {
    const out: TextOverride = {}
    if (has('font')) {
      out.font = font.key
      out.weight = weight
    }
    if (has('colour')) out.text_color = textColor
    if (has('box')) {
      if (box === 'none') {
        out.backdrop = 'none'
      } else if (box === 'dark') {
        out.backdrop = 'box'
        out.backdrop_color = '#030303'
        out.backdrop_opacity = 0.75
      } else if (box === 'light') {
        out.backdrop = 'box'
        out.backdrop_color = '#ffffff'
        out.backdrop_opacity = 1
      } else {
        out.backdrop = 'pill'
        out.backdrop_color = '#f59e0b'
        out.backdrop_opacity = 1
      }
      out.stroke = stroke
      out.stroke_color = '#030303'
      if (!has('colour')) {
        out.text_color =
          box === 'light' || box === 'pill-amber' ? '#030303' : '#ffffff'
      }
    }
    if (has('size')) out.size = pick(ROLE_SIZES[role])
    if (has('case')) {
      out.uppercase = uppercase
      out.italic = italic
    }
    if (has('position')) {
      out.position =
        role === 'cta'
          ? horizontal === 'center'
            ? 'bottom'
            : 'bottom left'
          : horizontal === 'center'
            ? vertical
            : `${vertical} left`
      if (horizontal === 'left') out.align = 'left'
      else out.align = 'center'
    }
    return out
  }

  return { hook: make('hook'), body: make('body'), cta: make('cta') }
}

function backgroundOf(style: OverlayTextStyle): Background {
  if (style.backdrop === 'none') return 'none'
  if (style.backdrop_color === ACCENT_BOX) return 'accent'
  return style.backdrop_color === '#ffffff' ? 'light' : 'dark'
}

const NEXT_BACKGROUND: Record<Background, Background> = {
  none: 'dark',
  dark: 'light',
  light: 'accent',
  accent: 'none',
}

const BACKGROUND_LABEL: Record<Background, string> = {
  none: 'No box',
  dark: 'Dark box',
  light: 'Light box',
  accent: 'Yellow box',
}

function withBackground(
  style: OverlayTextStyle,
  next: Background,
): TextOverride {
  const inkText = style.text_color === '#030303'
  if (next === 'none') {
    return {
      backdrop: 'none',
      text_color: inkText ? '#ffffff' : style.text_color,
    }
  }
  if (next === 'dark') {
    return {
      backdrop: 'box',
      backdrop_color: '#030303',
      backdrop_opacity: 0.8,
      text_color: inkText ? '#ffffff' : style.text_color,
      stroke: 'none',
    }
  }
  if (next === 'accent') {
    return {
      backdrop: 'box',
      backdrop_color: ACCENT_BOX,
      backdrop_opacity: 1,
      text_color: '#030303',
      stroke: 'none',
    }
  }
  return {
    backdrop: 'box',
    backdrop_color: '#ffffff',
    backdrop_opacity: 1,
    text_color: '#030303',
    stroke: 'none',
  }
}

const ALIGN_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
} as const

const ALIGN_NEXT = { left: 'center', center: 'right', right: 'left' } as const

/**
 * Story-style text tools: tap text in the preview, pick a font look, a colour,
 * a background and a size. Drag the text in the preview to move it.
 */
export function StoryTextToolbar({
  script,
  role,
  onRoleChange,
  onChange,
  scope,
  onScopeChange,
  frameIndex,
  frameCount,
  compact = false,
}: StoryTextToolbarProps) {
  const preset = getTextStylePreset(script.textStyle)
  const frameKey = String(frameIndex)
  const perFrame = frameCount > 1
  const activeScope: EditScope = perFrame ? scope : 'all'
  const effective = mergeOverrides(
    script.textOverrides,
    script.frameOverrides?.[frameKey],
  )
  const style = resolveTextStyle(preset, role, effective)
  const background = backgroundOf(style)
  const AlignIcon = ALIGN_ICONS[style.align]
  const sizeIndex = Math.max(
    0,
    OVERLAY_SIZES.findIndex((size) => size.key === style.size),
  )
  const hasFrameOverrides = Boolean(
    script.frameOverrides?.[frameKey] &&
      Object.keys(script.frameOverrides[frameKey]).length,
  )
  const hasOverrides =
    activeScope === 'frame'
      ? hasFrameOverrides
      : Boolean(
          (script.textOverrides && Object.keys(script.textOverrides).length) ||
            (script.frameOverrides &&
              Object.keys(script.frameOverrides).length),
        )
  const word = FRAME_WORD[script.schema]
  const [aspects, setAspects] = useState<Aspect[]>(DEFAULT_ASPECTS)

  useEffect(() => {
    void ensureOverlayFontCss()
  }, [])

  const patch = (change: TextOverride) => {
    if (activeScope === 'frame') {
      const frames = script.frameOverrides ?? {}
      const current = frames[frameKey] ?? {}
      onChange({
        ...script,
        frameOverrides: {
          ...frames,
          [frameKey]: {
            ...current,
            [role]: { ...(current[role] ?? {}), ...change },
          },
        },
      })
      return
    }
    const current = script.textOverrides ?? {}
    onChange({
      ...script,
      textOverrides: {
        ...current,
        [role]: { ...(current[role] ?? {}), ...change },
      },
      frameOverrides: undefined,
    })
  }

  const reset = () => {
    if (activeScope === 'frame') {
      const frames = { ...(script.frameOverrides ?? {}) }
      delete frames[frameKey]
      onChange({
        ...script,
        frameOverrides: Object.keys(frames).length ? frames : undefined,
      })
      return
    }
    onChange({ ...script, textOverrides: undefined, frameOverrides: undefined })
  }

  const shuffle = () => {
    const others = TEXT_STYLE_PRESETS.filter((item) => item.key !== preset.key)
    const pick = others[Math.floor(Math.random() * others.length)]
    if (!pick) return
    if (activeScope === 'all') {
      applyPreset(pick.key)
      return
    }
    const roleOverrides: Partial<Record<TextRole, TextOverride>> = {}
    for (const key of ['hook', 'body', 'cta'] as const) {
      const full = resolveTextStyle(pick, key)
      const position =
        key === 'hook'
          ? pick.hookPosition
          : key === 'body'
            ? pick.bodyPosition
            : pick.ctaPosition
      roleOverrides[key] = {
        font: full.font,
        weight: full.weight,
        size: full.size,
        align: full.align,
        uppercase: full.uppercase,
        italic: full.italic,
        text_color: full.text_color,
        backdrop: full.backdrop,
        backdrop_color: full.backdrop_color,
        backdrop_opacity: full.backdrop_opacity,
        stroke: full.stroke,
        stroke_color: full.stroke_color,
        position,
      }
    }
    onChange({
      ...script,
      frameOverrides: {
        ...(script.frameOverrides ?? {}),
        [frameKey]: roleOverrides,
      },
    })
  }

  const mix = () => {
    if (!aspects.length) return
    const combo = randomCombo(aspects)
    const roles = ['hook', 'body', 'cta'] as const
    if (activeScope === 'frame') {
      const frames = script.frameOverrides ?? {}
      const current = frames[frameKey] ?? {}
      const next: Partial<Record<TextRole, TextOverride>> = {}
      for (const key of roles) {
        next[key] = { ...(current[key] ?? {}), ...combo[key], x: undefined, y: undefined }
      }
      onChange({ ...script, frameOverrides: { ...frames, [frameKey]: next } })
      return
    }
    const current = script.textOverrides ?? {}
    const next: Partial<Record<TextRole, TextOverride>> = {}
    for (const key of roles) {
      next[key] = { ...(current[key] ?? {}), ...combo[key], x: undefined, y: undefined }
    }
    onChange({ ...script, textOverrides: next, frameOverrides: undefined })
  }

  const toggleAspect = (key: Aspect) =>
    setAspects((list) =>
      list.includes(key) ? list.filter((item) => item !== key) : [...list, key],
    )

  const applyPreset = (key: string) =>
    onChange({
      ...script,
      textStyle: key,
      textOverrides: undefined,
      frameOverrides: undefined,
    })

  const applyLook = (key: string) => {
    const look = TEXT_STYLE_PRESETS.find((item) => item.key === key)
    if (!look) return
    const full = resolveTextStyle(look, role)
    patch({
      font: full.font,
      weight: full.weight,
      size: full.size,
      align: full.align,
      uppercase: full.uppercase,
      italic: full.italic,
      text_color: full.text_color,
      backdrop: full.backdrop,
      backdrop_color: full.backdrop_color,
      backdrop_opacity: full.backdrop_opacity,
      stroke: full.stroke,
      stroke_color: full.stroke_color,
    })
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Font style">
          {TEXT_STYLE_PRESETS.map((item) => {
            const sample = resolveTextStyle(item, role)
            const active =
              style.font === sample.font &&
              style.weight === sample.weight &&
              style.uppercase === sample.uppercase &&
              style.italic === sample.italic
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={active}
                onClick={() => applyLook(item.key)}
                title={item.description}
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-full border px-3 transition-colors',
                  active
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-hairline-strong bg-surface-card text-ink hover:bg-muted',
                )}
              >
                <span
                  className="text-base leading-none"
                  style={{
                    fontFamily: overlayFontStack(sample.font),
                    fontWeight: sample.weight,
                    fontStyle: sample.italic ? 'italic' : 'normal',
                    textTransform: sample.uppercase ? 'uppercase' : 'none',
                  }}
                >
                  Aa
                </span>
                <span className="text-[13px]">{item.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-1.5" role="group" aria-label="Text colour">
            {OVERLAY_TEXT_COLORS.map((color) => (
              <button
                key={color.key}
                type="button"
                title={color.label}
                aria-label={color.label}
                aria-pressed={style.text_color === color.value}
                onClick={() => patch({ text_color: color.value })}
                className={cn(
                  'size-6 rounded-full border-2 border-white outline outline-1 outline-hairline-strong',
                  style.text_color === color.value && 'outline-2 outline-ink',
                )}
                style={{ backgroundColor: color.value }}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label="Change alignment"
            onClick={() => patch({ align: ALIGN_NEXT[style.align] })}
            className="flex size-8 items-center justify-center rounded-full border border-hairline-strong bg-surface-card text-ink hover:bg-muted"
          >
            <AlignIcon className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Change background"
            onClick={() =>
              patch(withBackground(style, NEXT_BACKGROUND[background]))
            }
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full border px-3 text-[13px]',
              background === 'none' &&
                'border-hairline-strong bg-surface-card text-ink',
              background === 'dark' && 'border-ink bg-ink text-canvas',
              background === 'light' && 'border-hairline-strong bg-white text-ink',
              background === 'accent' && 'border-ink bg-[#ffd60a] text-ink',
            )}
          >
            <Type className="size-3.5" />
            {BACKGROUND_LABEL[background]}
          </button>
          <button
            type="button"
            aria-label="Change outline"
            onClick={() => patch({ stroke: STROKE_NEXT[style.stroke] })}
            className={cn(
              'flex h-8 items-center rounded-full border px-3 text-[13px]',
              style.stroke === 'none'
                ? 'border-hairline-strong bg-surface-card text-ink'
                : 'border-ink bg-ink text-canvas',
            )}
          >
            {STROKE_LABEL[style.stroke]}
          </button>
          <div className="flex min-w-24 flex-1 items-center gap-2">
            <span className="text-xs text-graphite">A</span>
            <input
              type="range"
              min={0}
              max={OVERLAY_SIZES.length - 1}
              step={1}
              value={sizeIndex}
              aria-label="Text size"
              onChange={(e) =>
                patch({ size: OVERLAY_SIZES[Number(e.target.value)].key })
              }
              className="w-full accent-primary"
            />
            <span className="text-base leading-none text-graphite">A</span>
          </div>
          {hasOverrides ? (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 text-[13px] text-graphite hover:text-ink"
            >
              <RotateCcw className="size-3.5" /> Reset
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-canvas-soft p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-graphite">
            Preset for the whole piece
          </span>
          <button
            type="button"
            onClick={shuffle}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-hairline-strong bg-surface-card px-3 text-sm text-ink transition-colors hover:bg-muted"
          >
            <Shuffle className="size-3.5" />
            {activeScope === 'frame' ? `Shuffle this ${word}` : 'Shuffle all'}
          </button>
        </div>
        <div
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
          role="group"
          aria-label="Text preset"
        >
          {TEXT_STYLE_PRESETS.map((item) => {
            const sample = resolveTextStyle(item, 'hook')
            const selected = preset.key === item.key
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={selected}
                onClick={() => applyPreset(item.key)}
                title={item.description}
                className={cn(
                  'flex h-12 shrink-0 items-center gap-2 rounded-lg border px-3 transition-colors',
                  selected
                    ? 'border-ink bg-muted'
                    : 'border-hairline-strong bg-surface-card hover:bg-muted',
                )}
              >
                <span
                  className="text-xl leading-none text-ink"
                  style={{
                    fontFamily: overlayFontStack(sample.font),
                    fontWeight: sample.weight,
                    fontStyle: sample.italic ? 'italic' : 'normal',
                    textTransform: sample.uppercase ? 'uppercase' : 'none',
                  }}
                >
                  Aa
                </span>
                <span className="text-sm text-ink">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] font-medium text-graphite">
            Mix a random combination of
          </span>
          <button
            type="button"
            onClick={mix}
            disabled={!aspects.length}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-sm text-primary-foreground transition-colors hover:bg-primary-active disabled:opacity-40"
          >
            <Shuffle className="size-3.5" />
            {activeScope === 'frame' ? `Mix this ${word}` : 'Mix all'}
          </button>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Aspects to mix">
          {ASPECTS.map((aspect) => {
            const on = aspects.includes(aspect.key)
            return (
              <button
                key={aspect.key}
                type="button"
                aria-pressed={on}
                onClick={() => toggleAspect(aspect.key)}
                className={cn(
                  'h-8 rounded-full border px-3 text-sm transition-colors',
                  on
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-hairline-strong bg-surface-card text-graphite hover:bg-muted',
                )}
              >
                {aspect.label}
              </button>
            )
          })}
        </div>
      </div>

      {perFrame ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-medium text-graphite">
            Edit text style for
          </span>
          <div className="inline-flex gap-1 rounded-full border border-hairline-strong p-1">
            {(
              [
                ['frame', `This ${word} (${frameIndex + 1}/${frameCount})`],
                ['all', `All ${word}s`],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={activeScope === key}
                onClick={() => onScopeChange(key)}
                className={cn(
                  'h-8 rounded-full px-3 text-sm transition-colors',
                  activeScope === key
                    ? 'bg-primary text-primary-foreground'
                    : 'text-graphite hover:bg-muted hover:text-ink',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex gap-1 rounded-full border border-hairline-strong p-1">
          {ROLES.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={role === item.key}
              onClick={() => onRoleChange(item.key)}
              className={cn(
                'h-8 rounded-full px-3 text-sm transition-colors',
                role === item.key
                  ? 'bg-primary text-primary-foreground'
                  : 'text-graphite hover:bg-muted hover:text-ink',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
        {hasOverrides ? (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-sm text-graphite hover:text-ink"
          >
            <RotateCcw className="size-3.5" />{' '}
            {activeScope === 'frame' ? `Reset this ${word}` : 'Reset all'}
          </button>
        ) : null}
      </div>

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label="Font style"
      >
        {TEXT_STYLE_PRESETS.map((item) => {
          const sample = resolveTextStyle(item, role)
          const active =
            style.font === sample.font &&
            style.weight === sample.weight &&
            style.uppercase === sample.uppercase &&
            style.italic === sample.italic
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={active}
              onClick={() => applyLook(item.key)}
              className={cn(
                'flex h-12 shrink-0 items-center gap-2 rounded-full border px-4 transition-colors',
                active
                  ? 'border-ink bg-ink text-canvas'
                  : 'border-hairline-strong bg-surface-card text-ink hover:bg-muted',
              )}
            >
              <span
                className="text-xl leading-none"
                style={{
                  fontFamily: overlayFontStack(sample.font),
                  fontWeight: sample.weight,
                  fontStyle: sample.italic ? 'italic' : 'normal',
                  textTransform: sample.uppercase ? 'uppercase' : 'none',
                }}
              >
                Aa
              </span>
              <span className="text-sm">{item.label}</span>
            </button>
          )
        })}
      </div>

      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Text colour"
      >
        {OVERLAY_TEXT_COLORS.map((color) => (
          <button
            key={color.key}
            type="button"
            title={color.label}
            aria-label={color.label}
            aria-pressed={style.text_color === color.value}
            onClick={() => patch({ text_color: color.value })}
            className={cn(
              'size-8 rounded-full border-2 border-white outline outline-1 outline-hairline-strong',
              style.text_color === color.value && 'outline-2 outline-ink',
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          aria-label="Change alignment"
          onClick={() => patch({ align: ALIGN_NEXT[style.align] })}
          className="flex size-10 items-center justify-center rounded-full border border-hairline-strong bg-surface-card text-ink hover:bg-muted"
        >
          <AlignIcon className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Change background"
          onClick={() =>
            patch(withBackground(style, NEXT_BACKGROUND[background]))
          }
          className={cn(
            'flex h-10 items-center gap-2 rounded-full border px-4 text-sm',
            background === 'none' &&
              'border-hairline-strong bg-surface-card text-ink',
            background === 'dark' && 'border-ink bg-ink text-canvas',
            background === 'light' && 'border-hairline-strong bg-white text-ink',
            background === 'accent' && 'border-ink bg-[#ffd60a] text-ink',
          )}
        >
          <Type className="size-4" />
          {BACKGROUND_LABEL[background]}
        </button>
        <button
          type="button"
          aria-label="Change outline"
          onClick={() => patch({ stroke: STROKE_NEXT[style.stroke] })}
          className={cn(
            'flex h-10 items-center rounded-full border px-4 text-sm',
            style.stroke === 'none'
              ? 'border-hairline-strong bg-surface-card text-ink'
              : 'border-ink bg-ink text-canvas',
          )}
        >
          {STROKE_LABEL[style.stroke]}
        </button>
        <div className="flex min-w-32 flex-1 items-center gap-2">
          <span className="text-xs text-graphite">A</span>
          <input
            type="range"
            min={0}
            max={OVERLAY_SIZES.length - 1}
            step={1}
            value={sizeIndex}
            aria-label="Text size"
            onChange={(e) =>
              patch({ size: OVERLAY_SIZES[Number(e.target.value)].key })
            }
            className="w-full accent-primary"
          />
          <span className="text-lg leading-none text-graphite">A</span>
        </div>
      </div>

      <p className="text-[13px] text-graphite">
        Tap text in the preview to select it. Drag it to move it.
      </p>
    </div>
  )
}
