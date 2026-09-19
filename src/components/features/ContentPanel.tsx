import { useCallback, useEffect, useState } from 'react'
import { MoreVertical, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
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
        <Button onClick={openCreate} className="h-10 rounded-full px-5">
          <Plus /> New content
        </Button>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-slate">Loading…</p>
      ) : items.length === 0 ? (
        <Card className="mt-10 rounded-lg border-hairline bg-canvas p-0 shadow-none">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-heading-sm">No content yet</CardTitle>
            <CardDescription className="text-base text-graphite">
              Create your first content item for this app.
            </CardDescription>
          </CardHeader>
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
