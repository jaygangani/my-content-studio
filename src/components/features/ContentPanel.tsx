import { useCallback, useEffect, useMemo, useState } from 'react'
import { MoreVertical, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getMissingProfileFields } from '@/lib/profile'
import { getProfile } from '@/services/profile'
import {
  DAILY_GENERATION_LIMIT,
  discardContent,
  formatEnum,
  generateContentDraft,
  getUsageToday,
  listContentByApp,
} from '@/services/content'
import type { ContentItem } from '@/services/content'
import { parseScript } from '@/types/script'

interface ContentPanelProps {
  appId: string
  description: string | null | undefined
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatName(item: ContentItem): string {
  const script = parseScript(item.scriptJson)
  return script ? `#${script.formatId} ${script.formatName}` : '—'
}

interface ListProps {
  title: string
  items: ContentItem[]
  appId: string
  showApproved: boolean
  onDelete: (item: ContentItem) => void
}

function PieceTable({ title, items, appId, showApproved, onDelete }: ListProps) {
  return (
    <section className="mt-10">
      <h3 className="text-sm font-medium text-ink">
        {title} ({items.length})
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-graphite">Nothing here yet.</p>
      ) : (
        <Card className="mt-4 overflow-hidden rounded-xl border-hairline bg-surface-card p-0 shadow-none">
          <Table>
            <TableHeader>
              <TableRow className="border-hairline">
                <TableHead className="px-3 sm:px-6">Title</TableHead>
                <TableHead className="hidden px-6 md:table-cell">Format</TableHead>
                <TableHead className="hidden px-6 lg:table-cell">Type</TableHead>
                <TableHead className="hidden px-6 sm:table-cell">Created</TableHead>
                {showApproved ? (
                  <TableHead className="hidden px-6 sm:table-cell">Approved</TableHead>
                ) : null}
                <TableHead className="w-20 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-hairline">
                  <TableCell className="max-w-[200px] truncate px-3 py-4 text-sm font-semibold text-ink sm:max-w-[240px] sm:px-6">
                    <Link
                      to={`/apps/${appId}/content/${item.id}`}
                      className="transition-colors hover:text-graphite"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden px-6 py-4 text-sm text-graphite md:table-cell">
                    {formatName(item)}
                  </TableCell>
                  <TableCell className="hidden px-6 py-4 text-sm text-graphite lg:table-cell">
                    {item.igFormat ? formatEnum(item.igFormat) : '—'}
                  </TableCell>
                  <TableCell className="hidden px-6 py-4 text-sm text-graphite sm:table-cell">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  {showApproved ? (
                    <TableCell className="hidden px-6 py-4 text-sm text-graphite sm:table-cell">
                      {formatDate(item.approvedAt)}
                    </TableCell>
                  ) : null}
                  <TableCell className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-36 rounded-lg bg-popover">
                        <DropdownMenuItem asChild className="text-sm">
                          <Link to={`/apps/${appId}/content/${item.id}`}>
                            {showApproved ? 'Open & export' : 'Open'}
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={() => onDelete(item)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </section>
  )
}

/** Content tab: one-tap generation plus Drafts and Approved lists. */
export function ContentPanel({ appId, description }: ContentPanelProps) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [used, setUsed] = useState(0)
  const [missing, setMissing] = useState<string[]>([])

  const load = useCallback(async () => {
    setError(null)
    try {
      const [list, usage, profile] = await Promise.all([
        listContentByApp(appId),
        getUsageToday(appId),
        getProfile(appId),
      ])
      setItems(
        [...list].sort((a, b) =>
          (b.createdAt ?? '').localeCompare(a.createdAt ?? ''),
        ),
      )
      setUsed(usage)
      setMissing(getMissingProfileFields(description, profile.data))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [appId, description])

  useEffect(() => {
    void load()
  }, [load])

  const drafts = useMemo(() => items.filter((i) => i.status === 'DRAFT'), [items])
  const approved = useMemo(
    () => items.filter((i) => i.status === 'APPROVED'),
    [items],
  )

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return
    try {
      await discardContent(item.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setError(null)
    try {
      const result = await generateContentDraft(appId)
      setUsed(result.used)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content')
    } finally {
      setGenerating(false)
    }
  }

  const limitReached = used >= DAILY_GENERATION_LIMIT
  const blocked = generating || limitReached || missing.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-slate">content</p>
          <h2 className="text-heading-sm mt-4">Content</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite">
            One tap creates one draft. Review drafts in the feed, approve the
            ones you like, then export.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {drafts.length ? (
            <Button asChild variant="outline" className="h-10 rounded-full px-5">
              <Link to={`/feed?app=${appId}`}>Review {drafts.length} in feed</Link>
            </Button>
          ) : null}
          <Button
            onClick={() => void handleGenerate()}
            disabled={blocked}
            className="h-10 rounded-full px-5"
          >
            <Sparkles />{' '}
            {generating
              ? 'Generating…'
              : limitReached
                ? 'Limit reached — resets at midnight'
                : `Generate (${DAILY_GENERATION_LIMIT - used} left today)`}
          </Button>
        </div>
      </div>

      {missing.length ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          Complete the Profile tab first. Missing: {missing.join(', ')}.
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-slate">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="relative mx-auto mt-10 w-full max-w-xl overflow-hidden rounded-2xl border-hairline bg-canvas-soft p-0 shadow-none">
          <div
            aria-hidden="true"
            className="orb orb-lavender pointer-events-none absolute inset-0 opacity-70"
          />
          <CardContent className="relative flex flex-col items-center px-8 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-hairline">
              <Sparkles className="size-5 text-slate" />
            </span>
            <h3 className="text-heading-md mt-6">No content yet</h3>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-graphite">
              Fill in the profile, then tap Generate to draft your first piece.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PieceTable
            title="Drafts"
            items={drafts}
            appId={appId}
            showApproved={false}
            onDelete={(item) => void handleDelete(item)}
          />
          <PieceTable
            title="Approved"
            items={approved}
            appId={appId}
            showApproved
            onDelete={(item) => void handleDelete(item)}
          />
        </>
      )}
    </div>
  )
}
