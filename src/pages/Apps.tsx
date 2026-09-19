import { useCallback, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { MoreVertical, Plus } from 'lucide-react'
import { AppLogo } from '@/components/features/AppLogo'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { createApp, deleteApp, listApps, updateApp } from '@/services/apps'
import type { AppItem } from '@/services/apps'
import { deleteLogo, uploadLogo } from '@/services/storage'

interface AppFormState {
  name: string
  description: string
}

const EMPTY_FORM: AppFormState = { name: '', description: '' }

/**
 * Apps management page — full CRUD against the Amplify `Apps` table.
 * Logos upload to S3; the storage key is persisted on `Apps.logo`.
 */
export function AppsPage() {
  const [apps, setApps] = useState<AppItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AppFormState>(EMPTY_FORM)
  const [logoKey, setLogoKey] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const loadApps = useCallback(async () => {
    setError(null)
    try {
      setApps(await listApps())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load apps')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadApps()
  }, [loadApps])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(logoFile)
    setLogoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [logoFile])

  const resetLogo = () => {
    setLogoFile(null)
    setLogoKey('')
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    resetLogo()
    setDialogOpen(true)
  }

  const openEdit = (app: AppItem) => {
    setEditingId(app.id)
    setForm({ name: app.name, description: app.description ?? '' })
    setLogoFile(null)
    setLogoKey(app.logo ?? '')
    setDialogOpen(true)
  }

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLogoFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const nextLogo = logoFile ? await uploadLogo(logoFile) : logoKey
      const previousLogo = editingId
        ? apps.find((app) => app.id === editingId)?.logo
        : undefined

      const payload = {
        name: form.name.trim(),
        logo: nextLogo || undefined,
        description: form.description.trim() || undefined,
      }

      if (editingId) {
        await updateApp({ id: editingId, ...payload })
        if (
          logoFile &&
          previousLogo &&
          previousLogo !== nextLogo &&
          !previousLogo.startsWith('http')
        ) {
          await deleteLogo(previousLogo).catch(() => undefined)
        }
      } else {
        await createApp(payload)
      }

      setDialogOpen(false)
      await loadApps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save app')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (app: AppItem) => {
    if (!window.confirm(`Delete "${app.name}"?`)) return
    try {
      if (app.logo) {
        await deleteLogo(app.logo).catch(() => undefined)
      }
      await deleteApp(app.id)
      await loadApps()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete app')
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-slate">apps</p>
          <h1 className="text-heading-md mt-6">Your applications</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-graphite">
            Create, edit, and remove apps. Logos upload to storage; the object
            key is saved on the record.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11 rounded-full px-6">
          <Plus /> New app
        </Button>
      </div>

      {error ? (
        <p className="mt-8 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-12 text-sm text-slate">Loading…</p>
      ) : apps.length === 0 ? (
        <Card className="mt-12 rounded-lg border-hairline bg-canvas p-0 shadow-none">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="text-heading-sm">No apps yet</CardTitle>
            <CardDescription className="text-base text-graphite">
              Create your first app to get started.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="mt-12 overflow-hidden rounded-lg border-hairline bg-canvas p-0 shadow-none">
          <Table>
            <TableHeader>
              <TableRow className="border-hairline">
                <TableHead className="w-20 px-6">Logo</TableHead>
                <TableHead className="px-6">Name</TableHead>
                <TableHead className="px-6">Description</TableHead>
                <TableHead className="px-6">Logo key</TableHead>
                <TableHead className="w-20 px-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id} className="border-hairline">
                  <TableCell className="px-6 py-4">
                    <AppLogo
                      value={app.logo ?? ''}
                      alt={`${app.name} logo`}
                      className="size-10 rounded-md bg-surface-cool object-contain"
                    />
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm font-semibold text-ink">
                    <Link
                      to={`/apps/${app.id}`}
                      className="transition-colors hover:text-graphite"
                    >
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm text-graphite">
                    {app.description ?? '—'}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate px-6 py-4 text-xs text-slate">
                    {app.logo ?? '—'}
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
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={() => openEdit(app)}
                        >
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-sm"
                          onSelect={() => void handleDelete(app)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-lg bg-background">
          <DialogHeader>
            <DialogTitle className="text-heading-sm">
              {editingId ? 'Edit app' : 'New app'}
            </DialogTitle>
            <DialogDescription className="text-base text-graphite">
              {editingId
                ? 'Update the app details below.'
                : 'Add a new app to your workspace.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Name</span>
              <Input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Type a name"
                className="h-11 rounded-md border-hairline-soft"
              />
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Logo</span>
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Selected logo preview"
                    className="size-12 rounded-md bg-surface-cool object-contain"
                  />
                ) : (
                  <AppLogo
                    value={logoKey}
                    alt="Current logo"
                    className="size-12 rounded-md bg-surface-cool object-contain"
                  />
                )}
                <label className="flex h-11 cursor-pointer items-center rounded-full border border-hairline-soft px-5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink">
                  {logoFile ? 'Change image' : 'Upload image'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </label>
                {logoFile ? (
                  <button
                    type="button"
                    onClick={() => setLogoFile(null)}
                    className="text-sm text-graphite hover:text-ink"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <span className="text-[13px] leading-tight tracking-[-0.26px] text-stone">
                {logoKey && !logoFile ? logoKey : 'PNG, JPG or SVG.'}
              </span>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-ink">Description</span>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="What does this app do?"
                className="h-11 rounded-md border-hairline-soft"
              />
            </label>

            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                >
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="rounded-full">
                {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}