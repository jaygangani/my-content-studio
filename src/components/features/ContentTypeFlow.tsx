import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { FormatManager } from '@/components/features/FormatManager'
import {
  CONTENT_TYPES,
  REEL_SUBTYPES,
  REEL_SUBTYPE_KEYS,
  rowSubtype,
} from '@/lib/reelSubtypes'
import type { ContentTypeKey, ReelSubtypeKey } from '@/lib/reelSubtypes'
import { listFormats } from '@/services/formats'
import type { FormatDef } from '@/services/formats'

interface Counts {
  total: number
  enabled: number
}

function count(rows: FormatDef[]): Counts {
  return { total: rows.length, enabled: rows.filter((r) => r.enabled).length }
}

function Tile({
  title,
  description,
  counts,
  onClick,
}: {
  title: string
  description: string
  counts: Counts
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-1 rounded-xl border border-hairline-strong bg-surface-card p-4 text-left transition-colors hover:bg-muted"
    >
      <span className="text-sm font-medium text-ink">{title}</span>
      <span className="text-[13px] leading-snug text-graphite">{description}</span>
      <span className="mt-2 text-[12px] text-stone">
        {counts.total} {counts.total === 1 ? 'format' : 'formats'}
        {counts.total !== counts.enabled ? ` · ${counts.enabled} on` : ''}
      </span>
    </button>
  )
}

const TYPE_DESCRIPTION: Record<ContentTypeKey, string> = {
  reel: 'Short vertical videos. Choose a reel type, then manage its formats.',
  carousel: 'Swipeable branded slides.',
  image: 'Single branded image posts and meme cards.',
  story: 'Story frames with sticker ideas.',
}

/** Admin flow: content type, then (for reels) subtype, then its formats. */
export function ContentTypeFlow() {
  const [formats, setFormats] = useState<FormatDef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<ContentTypeKey | null>(null)
  const [subtype, setSubtype] = useState<ReelSubtypeKey | null>(null)

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
  }, [load, type, subtype])

  const typeSpec = CONTENT_TYPES.find((t) => t.key === type) ?? null

  const crumbs = (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
      <button
        type="button"
        onClick={() => {
          setType(null)
          setSubtype(null)
        }}
        className="inline-flex items-center gap-1 text-graphite hover:text-ink"
      >
        <ChevronLeft className="size-4" /> Content types
      </button>
      {typeSpec ? (
        <>
          <span className="text-stone">/</span>
          <button
            type="button"
            onClick={() => setSubtype(null)}
            className={subtype ? 'text-graphite hover:text-ink' : 'text-ink'}
          >
            {typeSpec.label}
          </button>
        </>
      ) : null}
      {subtype ? (
        <>
          <span className="text-stone">/</span>
          <span className="text-ink">{REEL_SUBTYPES[subtype].label}</span>
        </>
      ) : null}
    </div>
  )

  if (error) {
    return <p className="text-sm text-ink">{error}</p>
  }
  if (loading) return <p className="text-sm text-slate">Loading…</p>

  if (!typeSpec) {
    return (
      <div>
        {formats.length === 0 ? (
          <p className="mb-6 text-sm text-graphite">
            No formats yet. Run <code>npm run seed:formats</code> once to load the
            defaults.
          </p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {CONTENT_TYPES.map((item) => (
            <Tile
              key={item.key}
              title={item.label}
              description={TYPE_DESCRIPTION[item.key]}
              counts={count(formats.filter((f) => f.igFormat === item.igFormat))}
              onClick={() => setType(item.key)}
            />
          ))}
        </div>
      </div>
    )
  }

  if (typeSpec.key === 'reel' && !subtype) {
    return (
      <div>
        {crumbs}
        <div className="grid gap-3 sm:grid-cols-2">
          {REEL_SUBTYPE_KEYS.map((key) => (
            <Tile
              key={key}
              title={REEL_SUBTYPES[key].label}
              description={REEL_SUBTYPES[key].description}
              counts={count(
                formats.filter(
                  (f) => f.igFormat === 'REEL' && rowSubtype(f) === key,
                ),
              )}
              onClick={() => setSubtype(key)}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      {crumbs}
      <FormatManager
        key={`${typeSpec.key}:${subtype ?? ''}`}
        igFormat={typeSpec.igFormat}
        subtype={subtype ?? undefined}
      />
    </div>
  )
}
