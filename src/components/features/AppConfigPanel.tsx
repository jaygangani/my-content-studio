import { useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { AppLogo } from '@/components/features/AppLogo'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { updateApp } from '@/services/apps'
import type { AppItem } from '@/services/apps'
import { deleteLogo, uploadLogo } from '@/services/storage'

interface AppConfigPanelProps {
  app: AppItem
  onSaved: (app: AppItem) => void
}

/** Configurations tab: edit the app's name, description, and logo. */
export function AppConfigPanel({ app, onSaved }: AppConfigPanelProps) {
  const [name, setName] = useState(app.name)
  const [description, setDescription] = useState(app.description ?? '')
  const [context, setContext] = useState(app.context ?? '')
  const [logoKey, setLogoKey] = useState(app.logo ?? '')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setName(app.name)
    setDescription(app.description ?? '')
    setContext(app.context ?? '')
    setLogoKey(app.logo ?? '')
    setLogoFile(null)
    setSaved(false)
  }, [app])

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(logoFile)
    setLogoPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [logoFile])

  const handleLogoChange = (event: ChangeEvent<HTMLInputElement>) => {
    setLogoFile(event.target.files?.[0] ?? null)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const nextLogo = logoFile ? await uploadLogo(logoFile) : logoKey
      const previousLogo = app.logo ?? ''

      const updated = await updateApp({
        id: app.id,
        name: name.trim(),
        description: description.trim() || undefined,
        context: context.trim() || undefined,
        logo: nextLogo || undefined,
      })

      if (
        logoFile &&
        previousLogo &&
        previousLogo !== nextLogo &&
        !previousLogo.startsWith('http')
      ) {
        await deleteLogo(previousLogo).catch(() => undefined)
      }

      setLogoKey(nextLogo)
      setLogoFile(null)
      setSaved(true)
      if (updated) onSaved(updated)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div>
        <p className="eyebrow text-slate">configurations</p>
        <h2 className="text-heading-sm mt-4">Configurations</h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-graphite">
          Update how this app appears across your workspace.
        </p>
      </div>

      <Card className="mt-10 rounded-lg border-hairline bg-canvas p-0 shadow-none">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 px-8 py-8"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="config-name">Name</Label>
            <Input
              id="config-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a name"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-description">Description</Label>
            <Input
              id="config-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this app do?"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="config-context">Context</Label>
            <Textarea
              id="config-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Everything about your app — audience, voice, positioning, what makes it great…"
              className="min-h-36 rounded-md border-hairline-soft"
            />
            <span className="text-[13px] leading-tight tracking-[-0.26px] text-stone">
              Used as reference when generating content with AI.
            </span>
          </div>

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

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          {saved ? (
            <p className="text-sm text-graphite">Changes saved.</p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
