import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { VIRAL_MAX_SECONDS } from '@/lib/viral'
import {
  createViralVideo,
  deleteViralVideo,
  listViralVideos,
  readVideoDuration,
  updateViralVideo,
} from '@/services/viral'
import type { ViralVideo } from '@/services/viral'
import { getMediaUrl } from '@/services/storage'

/** Admin library of stock viral clips used by viral clip reels. */
export function ViralClipManager() {
  const [videos, setVideos] = useState<ViralVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<ViralVideo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [duration, setDuration] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setVideos(await listViralVideos())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos')
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

  const reset = () => {
    setEditing(null)
    setFile(null)
    setPreviewUrl(null)
    setDuration(0)
    setTitle('')
    setKeywords('')
  }

  const startEdit = async (video: ViralVideo) => {
    setError(null)
    setFile(null)
    setEditing(video)
    setTitle(video.title)
    setKeywords((video.keywords ?? []).filter(Boolean).join(', '))
    setDuration(video.durationSeconds ?? 0)
    try {
      setPreviewUrl(await getMediaUrl(video.videoKey))
    } catch {
      setPreviewUrl(null)
      setError('Could not load the video preview.')
    }
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const base = {
        title: title.trim(),
        keywords: keywords
          .split(/[,\n]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
      }
      if (editing) await updateViralVideo(editing.id, base)
      else if (file) {
        await createViralVideo(file, { ...base, durationSeconds: duration })
      } else throw new Error('Choose a video file first.')
      reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (video: ViralVideo) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteViralVideo(video)
      if (editing?.id === video.id) reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  const hasTarget = Boolean(editing || file)

  return (
    <div>
      <Card className="rounded-xl border-hairline bg-surface-card p-0 shadow-none">
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8"
        >
          <h3 className="text-sm font-medium text-ink">
            {editing ? `Edit "${editing.title}"` : 'Add a viral clip'}
          </h3>

          {!editing ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="vc-file">Video file</Label>
              <input
                id="vc-file"
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
                  ? ` · longer than ${VIRAL_MAX_SECONDS}s, only the first ${VIRAL_MAX_SECONDS}s are used`
                  : ''}
              </p>
            </div>
          ) : null}

          <div className="flex flex-col gap-2">
            <Label htmlFor="vc-title">Title</Label>
            <Input
              id="vc-title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Man staring at the rain"
              className="h-11 rounded-md border-hairline-soft"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="vc-keywords">Keywords</Label>
            <Input
              id="vc-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="sad, college, tired, nothing learnt"
              className="h-11 rounded-md border-hairline-soft"
            />
            <span className="text-[13px] text-stone">
              Comma separated. Sent to the AI so the text fits the video.
            </span>
          </div>

          {error ? (
            <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
              {error}
            </p>
          ) : null}

          <div className="flex justify-end gap-3">
            {hasTarget ? (
              <Button
                type="button"
                variant="outline"
                onClick={reset}
                className="rounded-full"
              >
                Cancel
              </Button>
            ) : null}
            <Button
              type="submit"
              disabled={saving || !hasTarget}
              className="rounded-full"
            >
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add clip'}
            </Button>
          </div>
        </form>
      </Card>

      <h3 className="mt-10 text-sm font-medium text-ink">
        Library ({videos.length})
      </h3>
      {loading ? (
        <p className="mt-3 text-sm text-slate">Loading…</p>
      ) : videos.length === 0 ? (
        <p className="mt-3 text-sm text-graphite">No clips yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {video.title}
                </p>
                <p className="mt-1 text-[13px] text-stone">
                  {(video.keywords ?? []).filter(Boolean).join(', ') ||
                    'No keywords'}
                  {video.durationSeconds
                    ? ` · ${Math.round(video.durationSeconds)}s`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Edit ${video.title}`}
                onClick={() => void startEdit(video)}
                className="rounded-full p-2 text-graphite transition-colors hover:bg-muted hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Delete ${video.title}`}
                onClick={() => void handleDelete(video)}
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
