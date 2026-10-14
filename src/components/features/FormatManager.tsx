import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { TestGeneratePanel } from '@/components/features/TestGeneratePanel'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { draftFormat } from '@/services/content'
import { REEL_SUBTYPES, rowSubtype } from '@/lib/reelSubtypes'
import type { ReelSubtypeKey } from '@/lib/reelSubtypes'
import { categoryLabel, listStockAssets } from '@/services/stock'
import type { StockAssetRow } from '@/services/stock'
import {
  CAROUSEL_VARIANTS,
  FORMAT_LAYOUTS,
  IG_FORMATS,
  REQUIRED_INPUT_HINT,
  STOCK_POLICIES,
  createFormat,
  deleteFormat,
  listFormats,
  saveFormat,
} from '@/services/formats'
import type { FormatDef } from '@/services/formats'

const selectClass =
  'h-10 w-full rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink'

interface FormatManagerProps {
  /** Show only this content type (IMAGE, CAROUSEL, STORY, REEL). */
  igFormat?: string
  /** Show only this reel subtype and create new formats under it. */
  subtype?: ReelSubtypeKey
}

/** Subtypes whose pipeline writes text for a stock clip. */
const COMPACT_SUBTYPES: string[] = ['reel.green-screen', 'reel.tweet-style']

interface Draft {
  assetIds: string[]
  name: string
  groupName: string
  igFormat: string
  enabled: boolean
  structure: string
  visual: string
  cta: string
  shareTrigger: string
  promptTemplate: string
  extraRules: string
  sharpen: string
  hooks: string
  requiredInputs: string
  layout: string
  variant: string
  lineCount: string
  slideMin: string
  slideMax: string
  stockPolicy: string
}

function toDraft(format: FormatDef | null): Draft {
  const list = (value: Array<string | null> | null | undefined) =>
    (value ?? []).filter(Boolean).join('\n')
  return {
    assetIds: (format?.assetIds ?? []).filter((id): id is string => !!id),
    name: format?.name ?? '',
    groupName: format?.groupName ?? '',
    igFormat: format?.igFormat ?? 'REEL',
    enabled: format?.enabled ?? true,
    structure: format?.structure ?? '',
    visual: format?.visual ?? '',
    cta: format?.cta ?? '',
    shareTrigger: format?.shareTrigger ?? '',
    promptTemplate: format?.promptTemplate ?? '',
    extraRules: format?.extraRules ?? '',
    sharpen: format?.sharpen ?? '',
    hooks: list(format?.hooks),
    requiredInputs: list(format?.requiredInputs),
    layout: format?.layout ?? '',
    variant: format?.variant ?? '',
    lineCount: format?.lineCount ? String(format.lineCount) : '',
    slideMin: format?.slideMin ? String(format.slideMin) : '',
    slideMax: format?.slideMax ? String(format.slideMax) : '',
    stockPolicy: format?.stockPolicy ?? '',
  }
}

function lines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function toNumber(value: string): number | null {
  const n = Number(value)
  return value.trim() && Number.isFinite(n) && n > 0 ? Math.round(n) : null
}

const IG_LABEL: Record<string, string> = {
  REEL: 'Reel',
  CAROUSEL: 'Carousel',
  IMAGE: 'Single image',
  STORY: 'Story',
}

/** Admin screen for the format catalog. */
export function FormatManager({ igFormat, subtype }: FormatManagerProps = {}) {
  const [formats, setFormats] = useState<FormatDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [editing, setEditing] = useState<FormatDef | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(toDraft(null))
  const [saving, setSaving] = useState(false)
  const [idea, setIdea] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [draftNote, setDraftNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setFormats(await listFormats())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load formats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return formats.filter(
      (format) =>
        (!igFormat || format.igFormat === igFormat) &&
        (!subtype || rowSubtype(format) === subtype) &&
        (!typeFilter || format.igFormat === typeFilter) &&
        (!q ||
          format.name.toLowerCase().includes(q) ||
          (format.groupName ?? '').toLowerCase().includes(q) ||
          String(format.formatId) === q),
    )
  }, [formats, query, typeFilter, igFormat, subtype])

  const open = (format: FormatDef | null) => {
    setError(null)
    setCreating(format === null)
    setEditing(format)
    setDraft(
      format === null && subtype
        ? { ...toDraft(null), igFormat: 'REEL' }
        : format === null && igFormat
          ? { ...toDraft(null), igFormat }
          : toDraft(format),
    )
    setIdea('')
    setDraftNote(null)
  }

  const handleDraft = async () => {
    if (!idea.trim()) return
    setDrafting(true)
    setError(null)
    setDraftNote(null)
    try {
      const { format, tokens } = await draftFormat(idea.trim())
      setDraft({
        name: format.name,
        groupName: format.groupName,
        igFormat: format.igFormat,
        enabled: true,
        structure: format.structure,
        visual: format.visual,
        cta: format.cta,
        shareTrigger: format.shareTrigger,
        promptTemplate: format.promptTemplate,
        extraRules: format.extraRules,
        sharpen: format.sharpen,
        hooks: format.hooks.join('\n'),
        requiredInputs: format.requiredInputs.join('\n'),
        layout: format.layout,
        variant: format.variant,
        lineCount: format.lineCount ? String(format.lineCount) : '',
        slideMin: format.slideMin ? String(format.slideMin) : '',
        slideMax: format.slideMax ? String(format.slideMax) : '',
        stockPolicy: format.stockPolicy === 'never' ? '' : format.stockPolicy,
        assetIds: [],
      })
      setDraftNote(
        `Form filled (${tokens} tokens). Review every field, then save.`,
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not draft the format')
    } finally {
      setDrafting(false)
    }
  }

  const close = () => {
    setEditing(null)
    setCreating(false)
  }

  const toggle = async (format: FormatDef) => {
    setError(null)
    try {
      const updated = await saveFormat(format.id, { enabled: !format.enabled })
      setFormats((list) => list.map((f) => (f.id === updated.id ? updated : f)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const fields = {
        name: draft.name.trim(),
        groupName: draft.groupName.trim(),
        igFormat: draft.igFormat as (typeof IG_FORMATS)[number],
        igFormatLabel: IG_LABEL[draft.igFormat] ?? draft.igFormat,
        enabled: draft.enabled,
        structure: draft.structure,
        visual: draft.visual,
        cta: draft.cta,
        shareTrigger: draft.shareTrigger,
        promptTemplate: draft.promptTemplate,
        extraRules: draft.extraRules,
        sharpen: draft.sharpen,
        hooks: lines(draft.hooks),
        requiredInputs: lines(draft.requiredInputs),
        layout: draft.layout,
        variant: draft.variant,
        lineCount: toNumber(draft.lineCount),
        slideMin: toNumber(draft.slideMin),
        slideMax: toNumber(draft.slideMax),
        stockPolicy: draft.stockPolicy,
        assetIds: draft.assetIds,
      }
      if (!fields.name) throw new Error('Name is required.')
      if (editing) {
        await saveFormat(editing.id, fields)
      } else {
        const nextId =
          Math.max(
            0,
            ...formats.filter((f) => f.formatId < 9000).map((f) => f.formatId),
          ) + 1
        const spec = subtype ? REEL_SUBTYPES[subtype] : null
        await createFormat({
          ...fields,
          contentType: subtype
            ? 'reel'
            : (IG_LABEL[draft.igFormat] ? draft.igFormat.toLowerCase() : 'reel'),
          subtype: subtype ?? '',
          assetCategory: spec?.assetCategory ?? '',
          formatId: nextId,
          kind:
            subtype === 'reel.green-screen'
              ? 'meme'
              : subtype === 'reel.tweet-style'
                ? 'viral'
                : 'standard',
          isMeme: false,
          repostAs: '',
          sortOrder: nextId,
        })
      }
      close()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (format: FormatDef) => {
    if (!window.confirm(`Delete "${format.name}"? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteFormat(format.id)
      if (editing?.id === format.id) close()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const [stockRows, setStockRows] = useState<StockAssetRow[]>([])
  useEffect(() => {
    void listStockAssets()
      .then(setStockRows)
      .catch(() => setStockRows([]))
  }, [])

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const activeSubtype = subtype ?? (editing ? rowSubtype(editing) : '')
  const compact = COMPACT_SUBTYPES.includes(activeSubtype)
  const subtypeSpec =
    activeSubtype in REEL_SUBTYPES ? REEL_SUBTYPES[activeSubtype as ReelSubtypeKey] : null
  const special = false
  const pinChoices = subtypeSpec?.assetCategory
    ? stockRows.filter((row) => row.category === subtypeSpec.assetCategory)
    : []
  const isCarousel = draft.igFormat === 'CAROUSEL'
  const isImage = draft.igFormat === 'IMAGE'

  const text = (
    key: keyof Draft,
    label: string,
    rows = 3,
    mono = false,
    hint?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`fmt-${key}`} className="text-[13px] text-graphite">
        {label}
      </Label>
      <Textarea
        id={`fmt-${key}`}
        rows={rows}
        value={draft[key] as string}
        onChange={(e) => set(key, e.target.value as never)}
        className={`rounded-md border-hairline-soft ${mono ? 'font-mono text-[13px]' : ''}`}
      />
      {hint ? <span className="text-[12px] text-stone">{hint}</span> : null}
    </div>
  )

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, group or id"
          className="h-10 w-full rounded-md border-hairline-soft sm:w-72"
        />
        {!igFormat && !subtype ? (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label="Filter by type"
            className="h-10 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink"
          >
            <option value="">All types</option>
            {IG_FORMATS.map((type) => (
              <option key={type} value={type}>
                {IG_LABEL[type]}
              </option>
            ))}
          </select>
        ) : null}
        <Button
          type="button"
          onClick={() => open(null)}
          className="ml-auto h-10 rounded-full px-5"
        >
          <Plus /> Add format
        </Button>
      </div>

      {error && !editing && !creating ? (
        <p className="mt-4 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-6 text-sm text-slate">Loading…</p>
      ) : formats.length === 0 ? (
        <p className="mt-6 text-sm text-graphite">
          No formats yet. Run <code>npm run seed:formats</code> once to load the
          defaults.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {visible.map((format) => (
            <li
              key={format.id}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface-card px-4 py-3"
            >
              <span className="w-10 shrink-0 text-[13px] tabular-nums text-stone">
                #{format.formatId}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${format.enabled ? 'text-ink' : 'text-stone line-through'}`}
                >
                  {format.name}
                </p>
                <p className="truncate text-[13px] text-stone">
                  {subtype
                    ? (format.groupName ?? '')
                    : (REEL_SUBTYPES[rowSubtype(format) as ReelSubtypeKey]?.label ??
                      IG_LABEL[format.igFormat ?? ''] ??
                      format.igFormat)}
                  {!subtype && format.groupName ? ` · ${format.groupName}` : ''}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-[13px] text-graphite">
                <input
                  type="checkbox"
                  checked={format.enabled}
                  onChange={() => void toggle(format)}
                  className="accent-primary"
                />
                On
              </label>
              <button
                type="button"
                aria-label={`Edit ${format.name}`}
                onClick={() => open(format)}
                className="rounded-full p-2 text-graphite transition-colors hover:bg-muted hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${format.name}`}
                onClick={() => void handleDelete(format)}
                className="rounded-full p-2 text-graphite transition-colors hover:bg-muted hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={Boolean(editing) || creating}
        onOpenChange={(next) => {
          if (!next) close()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? `#${editing.formatId} ${editing.name}` : 'Add format'}
            </DialogTitle>
            <DialogDescription>
              {compact && subtypeSpec
                ? `Your instructions are added to the ${subtypeSpec.label} prompt. Edits apply to the next generation, no deploy needed.`
                : 'Edits apply to the next generation, no deploy needed.'}
            </DialogDescription>
          </DialogHeader>

          {creating ? (
            <div className="flex flex-col gap-3 rounded-lg border border-hairline-soft p-4">
              <Label htmlFor="fmt-idea" className="text-sm font-medium text-ink">
                Describe the format in your own words
              </Label>
              <Textarea
                id="fmt-idea"
                rows={4}
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="A carousel that busts one myth per slide, red cross for the myth and green tick for the fact, ends with a soft CTA…"
                className="rounded-md border-hairline-soft"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={drafting || !idea.trim()}
                  onClick={() => void handleDraft()}
                  className="h-10 rounded-full px-5"
                >
                  {drafting ? <Loader2 className="animate-spin" /> : <Sparkles />}
                  {drafting ? 'Filling the form…' : 'Fill the form with AI'}
                </Button>
                {draftNote ? (
                  <span className="text-[13px] text-graphite">{draftNote}</span>
                ) : (
                  <span className="text-[13px] text-stone">
                    Fills the fields below. Nothing is saved until you press Save.
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fmt-name" className="text-[13px] text-graphite">
                Name
              </Label>
              <Input
                id="fmt-name"
                value={draft.name}
                onChange={(e) => set('name', e.target.value)}
                className="h-10 rounded-md border-hairline-soft"
              />
            </div>
            {!subtype ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fmt-group" className="text-[13px] text-graphite">
                  Group
                </Label>
                <Input
                  id="fmt-group"
                  value={draft.groupName}
                  onChange={(e) => set('groupName', e.target.value)}
                  className="h-10 rounded-md border-hairline-soft"
                />
              </div>
            ) : null}
            {!subtype && !igFormat ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="fmt-type" className="text-[13px] text-graphite">
                  Content type
                </Label>
                <select
                  id="fmt-type"
                  value={draft.igFormat}
                  disabled={Boolean(editing)}
                  onChange={(e) => set('igFormat', e.target.value)}
                  className={selectClass}
                >
                  {IG_FORMATS.map((type) => (
                    <option key={type} value={type}>
                      {IG_LABEL[type]}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-ink">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => set('enabled', e.target.checked)}
                className="accent-primary"
              />
              Enabled
            </label>
          </div>

          {compact ? (
            <>
              {text(
                'promptTemplate',
                'Instructions for the AI',
                6,
                false,
                'Plain instructions for this format: the angle, tone, what to avoid. Added to the default prompt.',
              )}
              {text('hooks', 'Line patterns (one per line)', 4, false)}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('extraRules', 'Extra rules', 3)}
                {text('sharpen', 'Sharpening rules', 3)}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="text-[13px] text-graphite">
                  {subtypeSpec?.assetCategory
                    ? `${categoryLabel(subtypeSpec.assetCategory)} to use`
                    : 'Assets'}
                </Label>
                <p className="text-[12px] text-stone">
                  Leave all unticked to use the whole category. Tick some to
                  pin this format to them.
                </p>
                {pinChoices.length === 0 ? (
                  <p className="text-sm text-graphite">
                    No assets in this category yet.
                  </p>
                ) : (
                  <ul className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
                    {pinChoices.map((asset) => (
                      <li key={asset.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-hairline-soft px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={draft.assetIds.includes(asset.id)}
                            onChange={() =>
                              set(
                                'assetIds',
                                draft.assetIds.includes(asset.id)
                                  ? draft.assetIds.filter((id) => id !== asset.id)
                                  : [...draft.assetIds, asset.id],
                              )
                            }
                            className="accent-primary"
                          />
                          <span className="truncate">{asset.title}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : !special ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {text('structure', 'Structure', 3)}
                {text('visual', 'Visual direction', 3)}
                {text('cta', 'CTA style', 2)}
                {text('shareTrigger', 'Why people share', 2)}
              </div>
              {text(
                'hooks',
                'Hook patterns (one per line)',
                4,
                false,
              )}
              {text(
                'promptTemplate',
                'Prompt template',
                12,
                true,
                'Placeholders: {{app_name}} {{persona}} {{pillar}} {{feature}} {{app_profile_json}}',
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                {text('extraRules', 'Extra rules', 3)}
                {text('sharpen', 'Sharpening rules', 3)}
              </div>
              {text(
                'requiredInputs',
                'Required profile inputs (one per line)',
                3,
                true,
                `Known: ${REQUIRED_INPUT_HINT.join(', ')}`,
              )}
              <div className="grid gap-4 sm:grid-cols-3">
                {draft.igFormat === 'IMAGE' || draft.igFormat === 'CAROUSEL' ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] text-graphite">Layout</Label>
                    <select
                      value={draft.layout}
                      onChange={(e) => set('layout', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Default</option>
                      {FORMAT_LAYOUTS.map((layout) => (
                        <option key={layout} value={layout}>
                          {layout}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {isCarousel ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] text-graphite">
                      Carousel layout
                    </Label>
                    <select
                      value={draft.variant}
                      onChange={(e) => set('variant', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Default</option>
                      {CAROUSEL_VARIANTS.map((variant) => (
                        <option key={variant} value={variant}>
                          {variant}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                {isCarousel || isImage ? (
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[13px] text-graphite">
                      Stock photo
                    </Label>
                    <select
                      value={draft.stockPolicy}
                      onChange={(e) => set('stockPolicy', e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Never (default)</option>
                      {STOCK_POLICIES.map((policy) => (
                        <option key={policy} value={policy}>
                          {policy}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-[13px] text-graphite">
                    Exact line count
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    value={draft.lineCount}
                    onChange={(e) => set('lineCount', e.target.value)}
                    className="h-10 rounded-md border-hairline-soft"
                  />
                </div>
                {isCarousel ? (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[13px] text-graphite">Min slides</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.slideMin}
                        onChange={(e) => set('slideMin', e.target.value)}
                        className="h-10 rounded-md border-hairline-soft"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[13px] text-graphite">Max slides</Label>
                      <Input
                        type="number"
                        min={1}
                        value={draft.slideMax}
                        onChange={(e) => set('slideMax', e.target.value)}
                        className="h-10 rounded-md border-hairline-soft"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}

          {editing ? (
            <TestGeneratePanel formats={formats} formatId={editing.formatId} />
          ) : null}

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              className="rounded-full"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="rounded-full"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
