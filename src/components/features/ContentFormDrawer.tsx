import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  CONTENT_STATUSES,
  CONTENT_TYPES,
  createContent,
  formatEnum,
  updateContent,
} from '@/services/content'
import type { ContentInput, ContentItem, ContentStatus, ContentType } from '@/services/content'

interface ContentFormDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appId: string
  content: ContentItem | null
  onSaved: () => Promise<void> | void
}

interface FormState {
  title: string
  status: ContentStatus | ''
  type: ContentType | ''
  postedOn: string
  angel: string
  targetPersona: string
  relatabilityHook: string
  caption: string
  hashtags: string
  videoKeywords: string
  overlayText: string
  videoConfigurations: string
  audioConfig: string
}

const EMPTY_FORM: FormState = {
  title: '',
  status: '',
  type: '',
  postedOn: '',
  angel: '',
  targetPersona: '',
  relatabilityHook: '',
  caption: '',
  hashtags: '',
  videoKeywords: '',
  overlayText: '',
  videoConfigurations: '',
  audioConfig: '',
}

function toJsonText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  return JSON.stringify(value, null, 2)
}

function toListText(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.filter((item): item is string => typeof item === 'string').join(', ')
}

function parseListText(value: string): string[] | undefined {
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length ? items : undefined
}

function parseJsonText(value: string, label: string): string | null | undefined {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    return JSON.stringify(JSON.parse(trimmed))
  } catch {
    throw new Error(`${label} must be valid JSON.`)
  }
}

/** Right-side drawer for creating or updating a Content record. */
export function ContentFormDrawer({
  open,
  onOpenChange,
  appId,
  content,
  onSaved,
}: ContentFormDrawerProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (!content) {
      setForm(EMPTY_FORM)
      return
    }
    setForm({
      title: content.title,
      status: content.status ?? '',
      type: content.type ?? '',
      postedOn: content.postedOn ? content.postedOn.slice(0, 10) : '',
      angel: content.angel ?? '',
      targetPersona: content.targetPersona ?? '',
      relatabilityHook: content.relatabilityHook ?? '',
      caption: content.caption ?? '',
      hashtags: toListText(content.hashtags),
      videoKeywords: toListText(content.videoKeywords),
      overlayText: toJsonText(content.overlayText),
      videoConfigurations: toJsonText(content.videoConfigurations),
      audioConfig: toJsonText(content.audioConfig),
    })
  }, [open, content])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const fields: Omit<ContentInput, 'appId'> = {
        title: form.title.trim(),
        status: form.status || undefined,
        type: form.type || undefined,
        postedOn: form.postedOn
          ? new Date(`${form.postedOn}T00:00:00.000Z`).toISOString()
          : undefined,
        angel: form.angel.trim() || undefined,
        targetPersona: form.targetPersona.trim() || undefined,
        relatabilityHook: form.relatabilityHook.trim() || undefined,
        caption: form.caption.trim() || undefined,
        hashtags: parseListText(form.hashtags),
        videoKeywords: parseListText(form.videoKeywords),
        overlayText: parseJsonText(form.overlayText, 'Overlay text'),
        videoConfigurations: parseJsonText(
          form.videoConfigurations,
          'Video configurations',
        ) ?? undefined,
        audioConfig: parseJsonText(form.audioConfig, 'Audio config') ?? undefined,
      }

      if (content) {
        await updateContent({ id: content.id, ...fields })
      } else {
        await createContent({ appId, ...fields })
      }

      onOpenChange(false)
      await onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save content')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader className="border-b border-hairline">
          <SheetTitle className="text-heading-sm">
            {content ? 'Edit content' : 'New content'}
          </SheetTitle>
          <SheetDescription className="text-sm text-graphite">
            {content
              ? 'Update the details for this content item.'
              : 'Add a new content item to this app.'}
          </SheetDescription>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-4 py-5"
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="content-title">Title</Label>
            <Input
              id="content-title"
              required
              value={form.title}
              onChange={(e) => setField('title', e.target.value)}
              placeholder="Type a title"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="content-status">Status</Label>
              <Select
                value={form.status || undefined}
                onValueChange={(value) =>
                  setField('status', value as ContentStatus)
                }
              >
                <SelectTrigger
                  id="content-status"
                  className="h-11 w-full rounded-md border-hairline-soft"
                >
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {formatEnum(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content-type">Type</Label>
              <Select
                value={form.type || undefined}
                onValueChange={(value) => setField('type', value as ContentType)}
              >
                <SelectTrigger
                  id="content-type"
                  className="h-11 w-full rounded-md border-hairline-soft"
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatEnum(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content-posted">Posted on</Label>
              <Input
                id="content-posted"
                type="date"
                value={form.postedOn}
                onChange={(e) => setField('postedOn', e.target.value)}
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="content-angel">Angel</Label>
              <Input
                id="content-angel"
                value={form.angel}
                onChange={(e) => setField('angel', e.target.value)}
                placeholder="e.g. founder story"
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-persona">Target persona</Label>
            <Input
              id="content-persona"
              value={form.targetPersona}
              onChange={(e) => setField('targetPersona', e.target.value)}
              placeholder="Who is this for?"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-hook">Relatability hook</Label>
            <Textarea
              id="content-hook"
              value={form.relatabilityHook}
              onChange={(e) => setField('relatabilityHook', e.target.value)}
              placeholder="The opening hook that earns attention"
              className="min-h-20 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-caption">Caption</Label>
            <Textarea
              id="content-caption"
              value={form.caption}
              onChange={(e) => setField('caption', e.target.value)}
              placeholder="Post caption"
              className="min-h-24 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-hashtags">Hashtags</Label>
            <Input
              id="content-hashtags"
              value={form.hashtags}
              onChange={(e) => setField('hashtags', e.target.value)}
              placeholder="comma, separated, tags"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-keywords">Video keywords</Label>
            <Input
              id="content-keywords"
              value={form.videoKeywords}
              onChange={(e) => setField('videoKeywords', e.target.value)}
              placeholder="comma, separated, keywords"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-overlay">Overlay text (JSON)</Label>
            <Textarea
              id="content-overlay"
              value={form.overlayText}
              onChange={(e) => setField('overlayText', e.target.value)}
              placeholder='{ "overlay_text_timeline": [{ "text": "...", "start_time_sec": 0, "end_time_sec": 3, "duration_sec": 3, "screen_position": "Center" }] }'
              className="min-h-24 rounded-md border-hairline-soft font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-config">Video configurations (JSON)</Label>
            <Textarea
              id="content-config"
              value={form.videoConfigurations}
              onChange={(e) => setField('videoConfigurations', e.target.value)}
              placeholder='{ "duration": 30 }'
              className="min-h-24 rounded-md border-hairline-soft font-mono text-xs"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content-audio">Audio config (JSON)</Label>
            <Textarea
              id="content-audio"
              value={form.audioConfig}
              onChange={(e) => setField('audioConfig', e.target.value)}
              placeholder='{ "sound_type": "lofi", "track_vibe": "calm focus" }'
              className="min-h-24 rounded-md border-hairline-soft font-mono text-xs"
            />
          </div>

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <SheetFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-full">
              {saving ? 'Saving…' : content ? 'Save changes' : 'Create content'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
