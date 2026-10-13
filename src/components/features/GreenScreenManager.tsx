import { useCallback, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_KEY_COLOR, createKeyer } from '@/lib/chromaKey'
import {
  createGreenScreenVideo,
  deleteGreenScreenVideo,
  listGreenScreenVideos,
  updateGreenScreenVideo,
} from '@/services/greenscreen'
import type { GreenScreenVideo } from '@/services/greenscreen'
import { getMediaUrl } from '@/services/storage'

const PREVIEW_SIDE = 360

function toHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** Keyed preview with side-by-side source: click the source to pick the key. */
function KeyPreview({
  url,
  keyColor,
  onPick,
}: {
  url: string
  keyColor: string
  onPick: (hex: string) => void
}) {
  const sourceRef = useRef<HTMLCanvasElement | null>(null)
  const keyedRef = useRef<HTMLCanvasElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setError(null)
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.loop = true
    video.muted = true
    video.playsInline = true
    video.src = url
    video.addEventListener('error', () =>
      setError('This video could not be loaded.'),
    )
    videoRef.current = video
    void video.play().catch(() => undefined)
    return () => {
      video.pause()
      video.removeAttribute('src')
      video.load()
      videoRef.current = null
    }
  }, [url])

  useEffect(() => {
    const keyer = createKeyer(keyColor, PREVIEW_SIDE * 2)
    let raf = 0
    const tick = () => {
      const video = videoRef.current
      const source = sourceRef.current
      const keyedCanvas = keyedRef.current
      if (video && source && keyedCanvas && video.readyState >= 2) {
        const ratio = video.videoWidth / video.videoHeight || 9 / 16
        const w = Math.round(PREVIEW_SIDE * Math.min(1, ratio))
        const h = Math.round(w / ratio)
        for (const canvas of [source, keyedCanvas]) {
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w
            canvas.height = h
          }
        }
        source.getContext('2d')?.drawImage(video, 0, 0, w, h)
        const keyed = keyer.render(video)
        const ctx = keyedCanvas.getContext('2d')
        if (ctx && keyed) {
          ctx.clearRect(0, 0, w, h)
          ctx.drawImage(keyed, 0, 0, w, h)
        }
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [keyColor])

  const handlePick = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const x = Math.floor(((event.clientX - rect.left) * canvas.width) / rect.width)
    const y = Math.floor(((event.clientY - rect.top) * canvas.height) / rect.height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return
    try {
      const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
      onPick(toHex(r, g, b))
    } catch {
      setError('Cannot read colours from this video (blocked cross-origin).')
    }
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="mb-2 text-[13px] text-stone">Source. Click the green.</p>
          <canvas
            ref={sourceRef}
            onPointerDown={handlePick}
            className="w-full cursor-crosshair rounded-md border border-hairline bg-ink"
          />
        </div>
        <div>
          <p className="mb-2 text-[13px] text-stone">Keyed result</p>
          <canvas
            ref={keyedRef}
            className="w-full rounded-md border border-hairline"
            style={{
              backgroundColor: '#ffffff',
              backgroundImage:
                'linear-gradient(45deg,#d4d4d4 25%,transparent 25%,transparent 75%,#d4d4d4 75%),linear-gradient(45deg,#d4d4d4 25%,transparent 25%,transparent 75%,#d4d4d4 75%)',
              backgroundSize: '16px 16px',
              backgroundPosition: '0 0, 8px 8px',
            }}
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-ink">{error}</p> : null}
    </div>
  )
}

/** Admin library of stock green screen meme videos. */
export function GreenScreenManager() {
  const [videos, setVideos] = useState<GreenScreenVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<GreenScreenVideo | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [keywords, setKeywords] = useState('')
  const [keyColor, setKeyColor] = useState(DEFAULT_KEY_COLOR)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    try {
      setVideos(await listGreenScreenVideos())
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
    setTitle('')
    setKeywords('')
    setKeyColor(DEFAULT_KEY_COLOR)
  }

  const startEdit = async (video: GreenScreenVideo) => {
    setError(null)
    setFile(null)
    setEditing(video)
    setTitle(video.title)
    setKeywords((video.keywords ?? []).filter(Boolean).join(', '))
    setKeyColor(video.keyColor)
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
      const input = {
        title: title.trim(),
        keywords: keywords
          .split(/[,\n]/)
          .map((k) => k.trim().toLowerCase())
          .filter(Boolean),
        keyColor,
      }
      if (editing) await updateGreenScreenVideo(editing.id, input)
      else if (file) await createGreenScreenVideo(file, input)
      else throw new Error('Choose a video file first.')
      reset()
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (video: GreenScreenVideo) => {
    if (!window.confirm(`Delete "${video.title}"? This cannot be undone.`)) return
    setError(null)
    try {
      await deleteGreenScreenVideo(video)
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
            {editing ? `Edit "${editing.title}"` : 'Add a green screen video'}
          </h3>

          {!editing ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="gs-file">Video file</Label>
              <input
                id="gs-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  const next = e.target.files?.[0] ?? null
                  setFile(next)
                  if (next && !title) {
                    setTitle(next.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
                  }
                }}
                className="text-sm"
              />
            </div>
          ) : null}

          {hasTarget && previewUrl ? (
            <KeyPreview url={previewUrl} keyColor={keyColor} onPick={setKeyColor} />
          ) : null}

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="gs-title">Title</Label>
              <Input
                id="gs-title"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Guy shrugging at laptop"
                className="h-11 rounded-md border-hairline-soft"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="gs-key">Green screen colour</Label>
              <div className="flex items-center gap-3">
                <input
                  id="gs-key"
                  type="color"
                  value={keyColor}
                  onChange={(e) => setKeyColor(e.target.value)}
                  className="h-11 w-14 cursor-pointer rounded-md border border-hairline-strong bg-transparent"
                />
                <span className="text-sm tabular-nums text-graphite">
                  {keyColor}
                </span>
                <button
                  type="button"
                  onClick={() => setKeyColor(DEFAULT_KEY_COLOR)}
                  className="text-sm text-graphite hover:text-ink"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gs-keywords">Keywords</Label>
            <Input
              id="gs-keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="confused, monday, work, shrug"
              className="h-11 rounded-md border-hairline-soft"
            />
            <span className="text-[13px] text-stone">
              Comma separated. Sent to the AI so the meme line fits the video.
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
              {saving ? 'Saving…' : editing ? 'Save changes' : 'Add video'}
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
        <p className="mt-3 text-sm text-graphite">No videos yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {videos.map((video) => (
            <li
              key={video.id}
              className="flex items-start gap-3 rounded-xl border border-hairline bg-surface-card p-4"
            >
              <span
                aria-hidden="true"
                className="mt-1 size-5 shrink-0 rounded-full border border-hairline-strong"
                style={{ backgroundColor: video.keyColor }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {video.title}
                </p>
                <p className="mt-1 text-[13px] text-stone">
                  {(video.keywords ?? []).filter(Boolean).join(', ') || 'No keywords'}
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
