import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { KeyPreview } from '@/components/features/KeyPreview'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_KEY_COLOR } from '@/lib/chromaKey'
import { VIRAL_MAX_SECONDS } from '@/lib/viral'
import {
  STOCK_CATEGORIES,
  categoryLabel,
  createStockAsset,
  deleteStockAsset,
  listStockAssets,
  readVideoDuration,
  updateStockAsset,
} from '@/services/stock'
import type { StockAssetRow } from '@/services/stock'
import { getMediaUrl } from '@/services/storage'

const selectClass =
  'h-10 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink'

/** One library for every stock asset, organised by category. */
export function StockLibrary() {
  const [assets, setAssets] = useState<StockAssetRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [editing, setEditing] = useState<StockAssetRow | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [category, setCategory] = useState<string>(STOCK_CATEGORIES[0].key)
  const [customCategory, setCustomCategory] = useState('')
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [keyColor, setKeyColor] = useState(DEFAULT_KEY_COLOR)
  const [duration, setDuration] = useState(0)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setAssets(await listStockAssets())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the library')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const categories = useMemo(() => {
    const known: string[] = STOCK_CATEGORIES.map((c) => c.key)
    const extra = [...new Set(assets.map((a) => a.category))].filter(
      (c) => !known.includes(c),
    )
    return [...known, ...extra]
  }, [assets])

  const visible = filter ? assets.filter((a) => a.category === filter) : assets
  const activeCategory = customCategory.trim() || category
  const keyed = activeCategory === 'green-screen'
  const hasTarget = Boolean(editing || file)

  const reset = () => {
    setEditing(null)
    setFile(null)
    setPreviewUrl(null)
    setTitle('')
    setKeywords('')
    setKeyColor(DEFAULT_KEY_COLOR)
    setDuration(0)
    setCustomCategory('')
  }

  const startEdit = async (asset: StockAssetRow) => {
    setError(null)
    setFile(null)
    setEditing(asset)
    setTitle(asset.title)
    setKeywords((asset.keywords ?? []).filter(Boolean).join(', '))
    setCategory(
      categories.includes(asset.category) ? asset.category : STOCK_CATEGORIES[0].key,
    )
    setCustomCategory(categories.includes(asset.category) ? '' : asset.category)
    setKeyColor(asset.keyColor || DEFAULT_KEY_COLOR)
    setDuration(asset.durationSeconds ?? 0)
    try {
      setPreviewUrl(await getMediaUrl(asset.assetKey))
    } catch {
      setPreviewUrl(null)
      setError('Could not load the preview.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const base = {
        category: activeCategory,
        title: title.trim(),
        keywords: keywords
          .split(/[,\n]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
        keyColor: keyed ? keyColor : undefined,
      }
      if (editing) await updateStockAsset(editing.id, base)
      else if (file) {
        await createStockAsset(file, { ...base, durationSeconds: duration })
      } else throw new Error('Choose a file first.')
      reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (asset: StockAssetRow) => {
    setError(null)
    try {
      const updated = await updateStockAsset(asset.id, { enabled: !asset.enabled })
      setAssets((list) => list.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  const handleDelete = async (asset: StockAssetRow) => {
    if (!window.confirm(`Delete "${asset.title}"? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteStockAsset(asset)
      if (editing?.id === asset.id) reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  return (
    <div>
      <Card className="rounded-xl border-hairline bg-surface-card p-0 shadow-none">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-5 px-4 py-6 sm:px-8 sm:py-8"
        >
          <h3 className="text-sm font-medium text-ink">
            {editing ? `Edit "${editing.title}"` : 'Add to the library'}
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-category" className="text-[13px] text-graphite">
                Category
              </Label>
              <select
                id="stock-category"
                value={customCategory ? '' : category}
                onChange={(e) => {
                  setCategory(e.target.value)
                  setCustomCategory('')
                }}
                className={selectClass}
              >
                {STOCK_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
                {customCategory ? <option value="">{customCategory}</option> : null}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-new" className="text-[13px] text-graphite">
                Or a new category
              </Label>
              <Input
                id="stock-new"
                value={customCategory}
                onChange={(e) =>
                  setCustomCategory(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'),
                  )
                }
                placeholder="e.g. reaction-clip"
                className="h-10 rounded-md border-hairline-soft"
              />
            </div>
          </div>

          {!editing ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-file" className="text-[13px] text-graphite">
                Video file
              </Label>
              <input
                id="stock-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null
                  setFile(next)
                  setDuration(0)
                  if (next) {
                    if (!title) {
                      setTitle(
                        next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
                      )
                    }
                    void readVideoDuration(next).then(setDuration)
                  }
                }}
                className="text-sm"
              />
            </div>
          ) : null}

          {hasTarget && previewUrl ? (
            keyed ? (
              <KeyPreview url={previewUrl} keyColor={keyColor} onPick={setKeyColor} />
            ) : (
              <div>
                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="max-h-96 rounded-md border border-hairline bg-ink"
                />
                <p className="mt-2 text-[13px] text-stone">
                  {duration ? `${duration.toFixed(1)}s` : 'Duration unknown'}
                  {duration > VIRAL_MAX_SECONDS
                    ? ` · only the first ${VIRAL_MAX_SECONDS}s are used by tweet-style reels`
                    : ''}
                </p>
              </div>
            )
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="stock-title" className="text-[13px] text-graphite">
                Title
              </Label>
              <Input
                id="stock-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-10 rounded-md border-hairline-soft"
              />
            </div>
            {keyed ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stock-key" className="text-[13px] text-graphite">
                  Green screen colour
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    id="stock-key"
                    type="color"
                    value={keyColor}
                    onChange={(e) => setKeyColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-hairline-strong bg-transparent"
                  />
                  <span className="text-sm tabular-nums text-graphite">{keyColor}</span>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stock-keywords" className="text-[13px] text-graphite">
              Keywords
            </Label>
            <Input
              id="stock-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="confused, monday, work"
              className="h-10 rounded-md border-hairline-soft"
            />
            <span className="text-[12px] text-stone">
              Comma separated. Sent to the AI so the text fits the clip.
            </span>
          </div>

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            {hasTarget ? (
              <Button type="button" variant="outline" onClick={reset} className="rounded-full">
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={saving || !hasTarget} className="rounded-full">
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add'}
            </Button>
          </div>
        </form>
      </Card>

      <div className="mt-10 flex flex-wrap items-center gap-2">
        <h3 className="mr-2 text-sm font-medium text-ink">
          Library ({visible.length})
        </h3>
        {['', ...categories].map((key) => (
          <button
            key={key || 'all'}
            type="button"
            aria-pressed={filter === key}
            onClick={() => setFilter(key)}
            className={`h-8 rounded-full border px-3 text-[13px] transition-colors ${
              filter === key
                ? 'border-ink bg-ink text-canvas'
                : 'border-hairline-strong text-graphite hover:bg-muted'
            }`}
          >
            {key ? categoryLabel(key) : 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-slate">Loading…</p>
      ) : visible.length === 0 ? (
        <p className="mt-4 text-sm text-graphite">
          Nothing here yet. If you had videos before, run{' '}
          <code>npm run migrate:reels</code> once to copy them into the library.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {visible.map((asset) => (
            <li
              key={asset.id}
              className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-card p-4"
            >
              {asset.keyColor ? (
                <span
                  aria-hidden="true"
                  className="mt-1 size-5 shrink-0 rounded-full border border-hairline-strong"
                  style={{ backgroundColor: asset.keyColor }}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${asset.enabled ? 'text-ink' : 'text-stone line-through'}`}
                >
                  {asset.title}
                </p>
                <p className="mt-1 text-[13px] text-stone">
                  {categoryLabel(asset.category)}
                  {asset.durationSeconds ? ` · ${Math.round(asset.durationSeconds)}s` : ''}
                  {(asset.keywords ?? []).filter(Boolean).length
                    ? ` · ${(asset.keywords ?? []).filter(Boolean).join(', ')}`
                    : ''}
                </p>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-graphite">
                <input
                  type="checkbox"
                  checked={asset.enabled}
                  onChange={() => void toggle(asset)}
                  className="accent-primary"
                />
                On
              </label>
              <button
                type="button"
                aria-label={`Edit ${asset.title}`}
                onClick={() => void startEdit(asset)}
                className="rounded-full p-2 text-graphite transition-colors hover:bg-muted hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${asset.title}`}
                onClick={() => void handleDelete(asset)}
                className="rounded-full p-2 text-graphite transition-colors hover:bg-muted hover:text-ink"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
