import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { MEME_LOOP_MAX, MEME_LOOP_MIN, normalizeMemeConfig } from '@/lib/meme'
import type { MemeConfig } from '@/lib/meme'
import { listGreenScreenVideos } from '@/services/greenscreen'
import type { GreenScreenVideo } from '@/services/greenscreen'
import { getMemeConfig, saveMemeConfig } from '@/services/profile'

interface MemeConfigPanelProps {
  appId: string
}

const BACKGROUNDS = [
  ['stock', 'Stock photo'],
  ['solid', 'Solid colour'],
  ['brand', 'Brand colour'],
] as const

/** Configurations tab section for meme reel defaults. */
export function MemeConfigPanel({ appId }: MemeConfigPanelProps) {
  const [config, setConfig] = useState<MemeConfig | null>(null)
  const [videos, setVideos] = useState<GreenScreenVideo[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([getMemeConfig(appId), listGreenScreenVideos()])
      .then(([stored, list]) => {
        if (cancelled) return
        setConfig(normalizeMemeConfig(stored))
        setVideos(list)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load')
        }
      })
    return () => {
      cancelled = true
    }
  }, [appId])

  if (!config) {
    return error ? (
      <p className="mt-6 text-sm text-ink">{error}</p>
    ) : (
      <p className="mt-6 text-sm text-slate">Loading…</p>
    )
  }

  const patch = (change: Partial<MemeConfig>) => {
    setSaved(false)
    setConfig({ ...config, ...change })
  }

  const toggleVideo = (id: string) => {
    const blocked = config.blockedVideoIds.includes(id)
    patch({
      blockedVideoIds: blocked
        ? config.blockedVideoIds.filter((v) => v !== id)
        : [...config.blockedVideoIds, id],
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveMemeConfig(appId, config)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-10 rounded-xl border-hairline bg-surface-card p-0 shadow-none">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h3 className="text-sm font-medium text-ink">Meme reels</h3>
          <p className="mt-2 text-sm text-graphite">
            Defaults for new meme reels. Each piece can still be changed in the
            editor.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Background</Label>
          <div className="flex flex-wrap items-center gap-2">
            {BACKGROUNDS.map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                aria-pressed={config.background.mode === mode}
                onClick={() =>
                  patch({ background: { ...config.background, mode } })
                }
                className={`h-9 rounded-full border px-4 text-sm transition-colors ${
                  config.background.mode === mode
                    ? 'border-ink bg-ink text-canvas'
                    : 'border-hairline-strong text-graphite hover:bg-muted'
                }`}
              >
                {label}
              </button>
            ))}
            <input
              type="color"
              aria-label="Solid background colour"
              value={config.background.color}
              onChange={(e) =>
                patch({
                  background: { ...config.background, color: e.target.value },
                })
              }
              className="h-9 w-12 cursor-pointer rounded-md border border-hairline-strong bg-transparent"
            />
          </div>
          <span className="text-[13px] text-stone">
            Colour is used for Solid colour. Brand colour uses the primary colour
            from the Profile tab. Stock photo uses an AI-picked search.
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="meme-default-length">
            Default length: {config.loopSeconds}s
          </Label>
          <input
            id="meme-default-length"
            type="range"
            min={MEME_LOOP_MIN}
            max={MEME_LOOP_MAX}
            step={1}
            value={config.loopSeconds}
            onChange={(e) => patch({ loopSeconds: Number(e.target.value) })}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="meme-default-position">Video position</Label>
            <select
              id="meme-default-position"
              value={config.clip.position}
              onChange={(e) =>
                patch({
                  clip: {
                    ...config.clip,
                    position: e.target.value as MemeConfig['clip']['position'],
                  },
                })
              }
              className="h-11 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm"
            >
              <option value="fill">Fill the screen</option>
              <option value="center">Centred</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="meme-default-scale">
              Video size: {Math.round(config.clip.scale * 100)}%
            </Label>
            <input
              id="meme-default-scale"
              type="range"
              min={30}
              max={150}
              step={5}
              value={Math.round(config.clip.scale * 100)}
              onChange={(e) =>
                patch({
                  clip: { ...config.clip, scale: Number(e.target.value) / 100 },
                })
              }
              className="mt-3 w-full accent-primary"
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="meme-default-volume">
              Video sound: {Math.round(config.clip.volume * 100)}%
            </Label>
            <input
              id="meme-default-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(config.clip.volume * 100)}
              onChange={(e) =>
                patch({
                  clip: { ...config.clip, volume: Number(e.target.value) / 100 },
                })
              }
              className="mt-3 w-full accent-primary"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Label>Green screen videos to use</Label>
          {videos.length === 0 ? (
            <p className="text-sm text-graphite">
              No videos in the library yet. An admin adds them in Admin assets.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {videos.map((video) => (
                <li key={video.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-hairline-soft p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={!config.blockedVideoIds.includes(video.id)}
                      onChange={() => toggleVideo(video.id)}
                      className="mt-0.5 accent-primary"
                    />
                    <span>
                      <span className="block font-medium text-ink">
                        {video.title}
                      </span>
                      <span className="block text-[13px] text-stone">
                        {(video.keywords ?? []).filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error ? (
          <p className="rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
            {error}
          </p>
        ) : null}
        {saved ? <p className="text-sm text-graphite">Meme settings saved.</p> : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-full"
          >
            {saving ? 'Saving…' : 'Save meme settings'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
