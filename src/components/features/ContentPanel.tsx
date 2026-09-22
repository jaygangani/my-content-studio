import { useCallback, useEffect, useState } from 'react'
import { MoreVertical, Plus, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from '@/components/ui/card'
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
import { ContentFormDrawer } from '@/components/features/ContentFormDrawer'
import {
  deleteContent,
  formatEnum,
  generateContentDraft,
  listContentByApp,
} from '@/services/content'
import type { ContentItem } from '@/services/content'

interface ContentPanelProps {
  appId: string
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

/** Content tab: table of a single app's content with drawer-based CRUD. */
export function ContentPanel({ appId }: ContentPanelProps) {
  const [items, setItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<ContentItem | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const loadContent = useCallback(async () => {
    setError(null)
    try {
      setItems(await listContentByApp(appId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  const openEdit = (item: ContentItem) => {
    setEditing(item)
    setDrawerOpen(true)
  }

  const handleDelete = async (item: ContentItem) => {
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) {
      return
    }
    if (
      !window.confirm(
        'Are you absolutely sure? This permanently removes the content item.',
      )
    ) {
      return
    }
    try {
      await deleteContent(item.id)
      await loadContent()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete content')
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    setGenerateError(null)
    try {
      await generateContentDraft({ appId })
      await loadContent()
    } catch (err) {
      setGenerateError(
        err instanceof Error ? err.message : 'Failed to generate content',
      )
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-slate">content</p>
          <h2 className="text-heading-sm mt-4">Content</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite">
            Every content item belongs to this app. Add, edit, or remove items
            from the drawer.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => void handleGenerate()}
            disabled={generating}
            className="h-10 rounded-full px-5"
          >
            <Sparkles /> {generating ? 'Generating…' : 'Generate with AI'}
          </Button>
          <Button onClick={openCreate} className="h-10 rounded-full px-5">
            <Plus /> New content
          </Button>
        </div>
      </div>

      {generateError ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {generateError}
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
        <Card className="mx-auto mt-10 w-full max-w-xl rounded-lg border-hairline bg-canvas p-0 shadow-none">
          <CardContent className="flex flex-col items-center px-8 py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-full border border-hairline">
              <Sparkles className="size-5 text-slate" />
            </span>
            <h3 className="text-heading-md mt-6">No content yet</h3>
            <p className="mt-3 max-w-sm text-base leading-relaxed text-graphite">
              Draft your first piece with AI or start from a blank item.
              Everything you publish for this app lives here.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => void handleGenerate()}
                disabled={generating}
                className="h-10 rounded-full px-5"
              >
                <Sparkles /> {generating ? 'Generating…' : 'Generate with AI'}
              </Button>
              <Button onClick={openCreate} className="h-10 rounded-full px-5">
                <Plus /> New content
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="mt-10 overflow-hidden rounded-lg border-hairline bg-canvas p-0 shadow-none">
          <Table>
            <TableHeader>
              <TableRow className="border-hairline">
                <TableHead className="px-6">Title</TableHead>
                <TableHead className="px-6">Status</TableHead>
                <TableHead className="px-6">Type</TableHead>
                <TableHead className="px-6">Posted on</TableHead>
                <TableHead className="px-6">Persona</TableHead>
                <TableHead className="w-20 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id} className="border-hairline">
                  <TableCell className="px-6 py-4 text-sm font-semibold text-ink">
                    <Link
                      to={`/apps/${appId}/content/${item.id}`}
                      className="transition-colors hover:text-graphite"
                    >
                      {item.title}
                    </Link>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-graphite">
                    {item.status ? formatEnum(item.status) : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-graphite">
                    {item.type ? formatEnum(item.type) : '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-graphite">
                    {formatDate(item.postedOn)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate px-6 py-4 text-sm text-graphite">
                    {item.targetPersona ?? '—'}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                        >
                          <MoreVertical />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-36 rounded-lg bg-popover">
                        <DropdownMenuItem asChild className="text-sm">
                          <Link to={`/apps/${appId}/content/${item.id}`}>
                            Open
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={() => openEdit(item)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={() => void handleDelete(item)}
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

      <ContentFormDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        appId={appId}
        content={editing}
        onSaved={loadContent}
      />
    </div>
  )
}
