import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Loader2, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CarouselChecklist } from '@/components/features/CarouselChecklist'
import { StoryTextToolbar } from '@/components/features/StoryTextToolbar'
import type { EditScope } from '@/components/features/StoryTextToolbar'
import { replaceAsset } from '@/services/assets'
import type { AssetItem } from '@/services/assets'
import { searchStock, updateContent } from '@/services/content'
import type { ContentItem, StockResult } from '@/services/content'
import { REEL_MAX_SECONDS, REEL_MIN_SECONDS } from '@/types/script'
import type { BrandAssets } from '@/lib/carousel'
import { CAROUSEL_ICONS } from '@/lib/carousel'
import type {
  CarouselSlide,
  CarouselVisualType,
  PieceScript,
  TextRole,
} from '@/types/script'
import { scriptCaption, scriptHashtags } from '@/types/script'

interface PieceEditorProps {
  piece: ContentItem
  script: PieceScript
  assets: AssetItem[]
  selectedRole: TextRole
  onSelectRole: (role: TextRole) => void
  frameIndex: number
  brandAssets?: BrandAssets | null
  onClose: () => void
  onSaved: (piece: ContentItem, script: PieceScript, assets: AssetItem[]) => void
  onPreview?: (script: PieceScript, assets: AssetItem[]) => void
}

interface SwapTarget {
  beatIndex: number
  query: string
  minSeconds: number
  type: 'VIDEO' | 'IMAGE'
}

function words(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function textOverflow(script: PieceScript): string[] {
  const warnings: string[] = []
  if (script.schema === 'REEL') {
    script.payload.beats.forEach((beat, i) => {
      if (words(beat.text) > 10) warnings.push(`Beat ${i + 1} is over 10 words.`)
    })
    if (words(script.payload.hook) > 8) warnings.push('Hook is over 8 words.')
  } else if (script.schema === 'CAROUSEL') {
    script.payload.slides.forEach((slide, i) => {
      if (words(slide.headline) > 8) {
        warnings.push(`Slide ${i + 1} headline is over 8 words.`)
      }
      if (words(slide.body) > 25) {
        warnings.push(`Slide ${i + 1} body is over 25 words.`)
      }
    })
  }
  return warnings
}

function frameCountOf(script: PieceScript): number {
  switch (script.schema) {
    case 'REEL':
      return script.payload.beats.length
    case 'CAROUSEL':
      return script.payload.slides.length
    case 'STORY':
      return script.payload.frames.length
    case 'IMAGE':
      return 1
  }
}

export interface PieceEditorHandle {
  moveRole: (role: TextRole, x: number, y: number) => void
}

/** Inline side panel for editing text, stock media and timing of a piece. */
export const PieceEditor = forwardRef<PieceEditorHandle, PieceEditorProps>(
  function PieceEditor(
    {
  piece,
  script,
  assets,
  selectedRole,
  onSelectRole,
  frameIndex,
  brandAssets,
  onClose,
  onSaved,
  onPreview,
    },
    ref,
  ) {
  const [draft, setDraft] = useState<PieceScript>(script)

  const [scope, setScope] = useState<EditScope>('frame')
  const frameRef = useRef(frameIndex)
  frameRef.current = frameIndex
  const scopeRef = useRef(scope)
  scopeRef.current = scope

  useImperativeHandle(ref, () => ({
    moveRole: (role, x, y) =>
      setDraft((current) => {
        const perFrame =
          scopeRef.current === 'frame' && frameCountOf(current) > 1
        if (perFrame) {
          const key = String(frameRef.current)
          const frames = current.frameOverrides ?? {}
          const frame = frames[key] ?? {}
          return {
            ...current,
            frameOverrides: {
              ...frames,
              [key]: { ...frame, [role]: { ...(frame[role] ?? {}), x, y } },
            },
          }
        }
        return {
          ...current,
          textOverrides: {
            ...(current.textOverrides ?? {}),
            [role]: { ...(current.textOverrides?.[role] ?? {}), x, y },
          },
        }
      }),
  }))
  const [localAssets, setLocalAssets] = useState<AssetItem[]>(assets)
  const [hashtags, setHashtags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [swap, setSwap] = useState<SwapTarget | null>(null)
  const [results, setResults] = useState<StockResult[]>([])
  const [swapQuery, setSwapQuery] = useState('')
  const [swapPage, setSwapPage] = useState(1)
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    setDraft(script)
    setLocalAssets(assets)
    setHashtags(scriptHashtags(script).join(' '))
    setSwap(null)
    setError(null)
  }, [script, assets])

  const previewRef = useRef(onPreview)
  previewRef.current = onPreview

  useEffect(() => {
    previewRef.current?.(draft, localAssets)
  }, [draft, localAssets])

  const total =
    draft.schema === 'REEL'
      ? draft.payload.beats.reduce((sum, b) => sum + (Number(b.seconds) || 0), 0)
      : 0
  const outOfRange =
    draft.schema === 'REEL' &&
    (total < REEL_MIN_SECONDS || total > REEL_MAX_SECONDS)
  const warnings = useMemo(() => textOverflow(draft), [draft])

  const setPayload = (next: PieceScript) => setDraft(next)

  const patchSlide = (index: number, change: Partial<CarouselSlide>) =>
    setDraft((current) =>
      current.schema === 'CAROUSEL'
        ? {
            ...current,
            payload: {
              ...current.payload,
              slides: current.payload.slides.map((s, i) =>
                i === index ? { ...s, ...change } : s,
              ),
            },
          }
        : current,
    )

  const runSearch = async (target: SwapTarget, query: string, page: number) => {
    setSearching(true)
    setError(null)
    try {
      setResults(await searchStock(query, target.type, page, target.minSeconds))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  const openSwap = (target: SwapTarget) => {
    setSwap(target)
    setSwapQuery(target.query)
    setSwapPage(1)
    void runSearch(target, target.query, 1)
  }

  const pickAsset = async (result: StockResult) => {
    if (!swap) return
    setError(null)
    try {
      const existing = localAssets.find((a) => a.beatIndex === swap.beatIndex)
      const saved = await replaceAsset(piece.id, swap.beatIndex, existing, result)
      setLocalAssets((current) => [
        ...current.filter((a) => a.beatIndex !== swap.beatIndex),
        saved,
      ])
      setSwap(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to swap media')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const tags = hashtags
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
      const nextScript: PieceScript =
        draft.schema === 'STORY'
          ? draft
          : draft.schema === 'REEL'
            ? {
                ...draft,
                payload: {
                  ...draft.payload,
                  hashtags: tags,
                  unified: true,
                  hook: draft.payload.beats[0]?.text ?? draft.payload.hook,
                  cta:
                    draft.payload.beats[draft.payload.beats.length - 1]?.text ??
                    draft.payload.cta,
                },
              }
            : ({ ...draft, payload: { ...draft.payload, hashtags: tags } } as PieceScript)
      const title =
        nextScript.schema === 'REEL'
          ? nextScript.payload.hook
          : nextScript.schema === 'CAROUSEL'
            ? nextScript.payload.slides[0]?.headline
            : nextScript.schema === 'IMAGE'
              ? nextScript.payload.text_lines[0]
              : nextScript.payload.frames[0]?.text
      const updated = await updateContent({
        id: piece.id,
        title: title || piece.title,
        scriptJson: JSON.stringify(nextScript),
        caption: scriptCaption(nextScript),
        hashtags: scriptHashtags(nextScript),
      })
      if (updated) onSaved(updated, nextScript, localAssets)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    multiline = false,
  ) => (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {multiline ? (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-20 rounded-md border-hairline-soft"
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-md border-hairline-soft"
        />
      )}
    </div>
  )

  const swapButton = (target: SwapTarget) => (
    <Button
      type="button"
      variant="outline"
      onClick={() => openSwap(target)}
      className="h-9 w-fit rounded-full px-4"
    >
      <RefreshCw /> Swap {target.type === 'VIDEO' ? 'clip' : 'image'}
    </Button>
  )

  return (
    <aside className="flex min-w-0 flex-col gap-6 rounded-xl border border-hairline bg-surface-card p-4 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-slate">edit</p>
          <h2 className="text-heading-sm mt-3">Edit piece</h2>
          <p className="mt-2 text-sm text-graphite">
            Changes show in the preview. Save to keep them.
          </p>
        </div>
        <button
          type="button"
          aria-label="Close editor"
          onClick={onClose}
          className="text-graphite transition-colors hover:text-ink"
        >
          <X className="size-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6">
          {draft.schema === 'CAROUSEL' &&
          brandAssets &&
          draft.payload.slides.some((s) => s.visual_type) ? (
            <CarouselChecklist script={draft} brandAssets={brandAssets} />
          ) : null}

          {draft.schema === 'CAROUSEL' &&
          brandAssets &&
          draft.payload.slides.some((s) => s.visual_type) ? null : (
          <StoryTextToolbar
            script={draft}
            role={selectedRole}
            onRoleChange={onSelectRole}
            onChange={setPayload}
            scope={scope}
            onScopeChange={setScope}
            frameIndex={frameIndex}
            frameCount={frameCountOf(draft)}
          />
          )}

          {draft.schema === 'REEL' ? (
            <>
              {draft.payload.beats.map((beat, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border border-hairline-soft p-4"
                >
                  <span className="eyebrow text-slate">
                    Beat {index + 1}
                    {index === 0
                      ? ' · opening hook'
                      : index === draft.payload.beats.length - 1
                        ? ' · call to action'
                        : ''}
                  </span>
                  {field(`beat-${index}`, 'Text', beat.text, (text) =>
                    setPayload({
                      ...draft,
                      payload: {
                        ...draft.payload,
                        beats: draft.payload.beats.map((b, i) =>
                          i === index ? { ...b, text } : b,
                        ),
                      },
                    }),
                  )}
                  <div className="flex flex-col gap-2">
                    <Label htmlFor={`beat-sec-${index}`}>Seconds</Label>
                    <Input
                      id={`beat-sec-${index}`}
                      type="number"
                      min={1}
                      step={0.5}
                      value={beat.seconds}
                      onChange={(e) =>
                        setPayload({
                          ...draft,
                          payload: {
                            ...draft.payload,
                            beats: draft.payload.beats.map((b, i) =>
                              i === index
                                ? { ...b, seconds: Number(e.target.value) }
                                : b,
                            ),
                          },
                        })
                      }
                      className="h-11 rounded-md border-hairline-soft"
                    />
                  </div>
                  {swapButton({
                    beatIndex: index,
                    query: beat.visual_query,
                    minSeconds: beat.seconds,
                    type: 'VIDEO',
                  })}
                </div>
              ))}
              <p className={outOfRange ? 'text-sm text-ink' : 'text-sm text-graphite'}>
                Total {total.toFixed(1)}s. Allowed {REEL_MIN_SECONDS}-{REEL_MAX_SECONDS}s.
              </p>
            </>
          ) : null}

          {draft.schema === 'CAROUSEL' && draft.payload.slides.some((s) => s.visual_type) ? (
            <div className="flex flex-col gap-2">
              <Label>Slide background</Label>
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    ['dark', 'Dark'],
                    ['light', 'Light'],
                    ['tinted', 'Tinted'],
                    ['bold', 'Bold colour'],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={(draft.bgScheme ?? 'dark') === key}
                    onClick={() => setPayload({ ...draft, bgScheme: key })}
                    className={`h-9 rounded-full border px-4 text-sm transition-colors ${
                      (draft.bgScheme ?? 'dark') === key
                        ? 'border-ink bg-ink text-canvas'
                        : 'border-hairline-strong text-graphite hover:bg-muted'
                    }`}
                  >
                    {label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setPayload({
                      ...draft,
                      bgScheme: (['dark', 'light', 'tinted', 'bold'] as const)[
                        Math.floor(Math.random() * 4)
                      ],
                    })
                  }
                  className="h-9 rounded-full border border-hairline-strong px-4 text-sm text-graphite hover:bg-muted"
                >
                  Shuffle
                </button>
              </div>
            </div>
          ) : null}

          {draft.schema === 'CAROUSEL' && draft.payload.slides.some((s) => s.visual_type) ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="hook-cover">First slide design</Label>
              <div className="flex gap-2">
                <select
                  id="hook-cover"
                  value={draft.hookCover ?? 'classic'}
                  onChange={(e) =>
                    setPayload({
                      ...draft,
                      hookCover: e.target.value as NonNullable<PieceScript['hookCover']>,
                    })
                  }
                  className="h-11 flex-1 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm"
                >
                  <option value="classic">Classic (left aligned)</option>
                  <option value="centered">Centred with rings</option>
                  <option value="bigtype">Big type</option>
                  <option value="framed">Framed</option>
                  <option value="split">Colour block with icon</option>
                  <option value="badge">Icon badge</option>
                  <option value="stripe">Diagonal band</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const covers = [
                      'classic',
                      'centered',
                      'bigtype',
                      'framed',
                      'split',
                      'badge',
                      'stripe',
                    ] as const
                    setPayload({
                      ...draft,
                      hookCover: covers[Math.floor(Math.random() * covers.length)],
                    })
                  }}
                  className="h-11 rounded-full border border-hairline-strong px-4 text-sm text-graphite hover:bg-muted"
                >
                  Shuffle
                </button>
              </div>
            </div>
          ) : null}

          {draft.schema === 'CAROUSEL'
            ? draft.payload.slides.map((slide, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border border-hairline-soft p-4"
                >
                  <span className="eyebrow text-slate">
                    Slide {index + 1}
                    {slide.role ? ` · ${slide.role}` : ''}
                  </span>
                  {field(`slide-h-${index}`, 'Headline', slide.headline, (headline) =>
                    setPayload({
                      ...draft,
                      payload: {
                        ...draft.payload,
                        slides: draft.payload.slides.map((s, i) =>
                          i === index ? { ...s, headline } : s,
                        ),
                      },
                    }),
                  )}
                  {field(
                    `slide-b-${index}`,
                    'Body',
                    slide.body,
                    (body) =>
                      setPayload({
                        ...draft,
                        payload: {
                          ...draft.payload,
                          slides: draft.payload.slides.map((s, i) =>
                            i === index ? { ...s, body } : s,
                          ),
                        },
                      }),
                    true,
                  )}
                  {slide.visual_type ? (
                    <>
                      <div className="flex flex-col gap-2">
                        <Label htmlFor={`slide-v-${index}`}>Visual</Label>
                        <select
                          id={`slide-v-${index}`}
                          value={slide.visual_type}
                          onChange={(e) =>
                            patchSlide(index, {
                              visual_type: e.target.value as CarouselVisualType,
                            })
                          }
                          className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm"
                        >
                          <option value="typography">Typography only</option>
                          <option value="icon">Icon</option>
                          <option value="data">Big number</option>
                          <option value="screenshot">Product screenshot</option>
                          {draft.stockPolicy !== 'never' ||
                          slide.visual_type === 'stock' ? (
                            <option value="stock">Stock photo (last resort)</option>
                          ) : null}
                        </select>
                      </div>
                      {slide.visual_type === 'icon' ? (
                        <select
                          aria-label="Icon"
                          value={slide.icon || 'check'}
                          onChange={(e) => patchSlide(index, { icon: e.target.value })}
                          className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm"
                        >
                          {CAROUSEL_ICONS.map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      ) : null}
                      {slide.visual_type === 'data' ? (
                        <>
                          {field(`slide-sv-${index}`, 'Big number', slide.stat_value ?? '', (stat_value) =>
                            patchSlide(index, { stat_value }),
                          )}
                          {field(`slide-sl-${index}`, 'Label', slide.stat_label ?? '', (stat_label) =>
                            patchSlide(index, { stat_label }),
                          )}
                        </>
                      ) : null}
                      {slide.visual_type === 'screenshot' ? (
                        <select
                          aria-label="Feature screenshot"
                          value={slide.visual}
                          onChange={(e) => patchSlide(index, { visual: e.target.value })}
                          className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm"
                        >
                          <option value="">Choose a feature screenshot</option>
                          {(brandAssets?.features ?? [])
                            .filter((f) => brandAssets?.screenshots[f.id])
                            .map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                        </select>
                      ) : null}
                      {slide.visual_type === 'stock'
                        ? swapButton({
                            beatIndex: index,
                            query: slide.visual,
                            minSeconds: 0,
                            type: 'IMAGE',
                          })
                        : null}
                    </>
                  ) : (
                    swapButton({
                      beatIndex: index,
                      query: slide.visual,
                      minSeconds: 0,
                      type: 'IMAGE',
                    })
                  )}
                </div>
              ))
            : null}

          {draft.schema === 'IMAGE' ? (
            <>
              {field(
                'image-lines',
                'Text',
                draft.payload.text_lines.join('\n'),
                (value) =>
                  setPayload({
                    ...draft,
                    payload: {
                      ...draft.payload,
                      text_lines: value.split('\n'),
                    },
                  }),
                true,
              )}
              {swapButton({
                beatIndex: 0,
                query: draft.payload.visual,
                minSeconds: 0,
                type: 'IMAGE',
              })}
            </>
          ) : null}

          {draft.schema === 'STORY'
            ? draft.payload.frames.map((frame, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border border-hairline-soft p-4"
                >
                  <span className="eyebrow text-slate">Frame {index + 1}</span>
                  {field(`frame-${index}`, 'Text', frame.text, (text) =>
                    setPayload({
                      ...draft,
                      payload: {
                        ...draft.payload,
                        frames: draft.payload.frames.map((f, i) =>
                          i === index ? { ...f, text } : f,
                        ),
                      },
                    }),
                  )}
                  {frame.sticker && frame.sticker !== 'none' ? (
                    <p className="text-[13px] text-stone">
                      Add a {frame.sticker} sticker in Instagram:{' '}
                      {frame.sticker_text}
                      {frame.options.length ? ` (${frame.options.join(' / ')})` : ''}
                    </p>
                  ) : null}
                </div>
              ))
            : null}

          {field(
            'edit-caption',
            draft.schema === 'STORY' ? 'Caption note' : 'Caption',
            scriptCaption(draft),
            (value) =>
              setPayload(
                draft.schema === 'STORY'
                  ? { ...draft, payload: { ...draft.payload, caption_note: value } }
                  : ({
                      ...draft,
                      payload: { ...draft.payload, caption: value },
                    } as PieceScript),
              ),
            true,
          )}

          {draft.schema !== 'STORY'
            ? field('edit-tags', 'Hashtags', hashtags, setHashtags)
            : null}

          {warnings.length ? (
            <ul className="text-sm text-graphite">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          ) : null}

          {swap ? (
            <div className="flex flex-col gap-3 rounded-lg border border-hairline p-4">
              <div className="flex gap-2">
                <Input
                  value={swapQuery}
                  onChange={(e) => setSwapQuery(e.target.value)}
                  className="h-10 rounded-md border-hairline-soft"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSwapPage(1)
                    void runSearch(swap, swapQuery, 1)
                  }}
                  className="h-10 rounded-full px-4"
                >
                  Search
                </Button>
              </div>
              {searching ? (
                <Loader2 className="size-4 animate-spin text-slate" />
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {results.map((result) => (
                    <button
                      key={result.url}
                      type="button"
                      onClick={() => void pickAsset(result)}
                      className="overflow-hidden rounded-md border border-hairline-soft"
                    >
                      <img
                        src={result.previewUrl}
                        alt={result.query}
                        className="aspect-[9/16] w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setSwap(null)}
                  className="text-sm text-graphite hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const next = swapPage + 1
                    setSwapPage(next)
                    void runSearch(swap, swapQuery, next)
                  }}
                  className="text-sm text-graphite hover:text-ink"
                >
                  More results
                </button>
              </div>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}
      </div>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-full"
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={saving || outOfRange}
          onClick={() => void handleSave()}
          className="rounded-full"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </aside>
  )
  },
)
