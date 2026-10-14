import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { getViralConfig, saveViralConfig } from '@/services/profile'
import type { ViralConfig } from '@/services/profile'
import { listCategoryAssets } from '@/services/stock'
import type { CategoryAsset } from '@/services/stock'

interface ViralConfigPanelProps {
  appId: string
}

/** Configurations tab section for viral clip reel defaults. */
export function ViralConfigPanel({ appId }: ViralConfigPanelProps) {
  const [config, setConfig] = useState<ViralConfig | null>(null)
  const [videos, setVideos] = useState<CategoryAsset[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void Promise.all([getViralConfig(appId), listCategoryAssets('viral-clip')])
      .then(([stored, list]) => {
        if (cancelled) return
        setConfig(stored)
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

  const patch = (change: Partial<ViralConfig>) => {
    setSaved(false)
    setConfig({ ...config, ...change })
  }

  const toggleVideo = (id: string) =>
    patch({
      blockedVideoIds: config.blockedVideoIds.includes(id)
        ? config.blockedVideoIds.filter((v) => v !== id)
        : [...config.blockedVideoIds, id],
    })

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await saveViralConfig(appId, config)
      setSaved(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="mt-6 rounded-xl border-hairline bg-surface-card p-0 shadow-none">
      <div className="flex flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
        <div>
          <h3 className="text-sm font-medium text-ink">Viral clip reels</h3>
          <p className="mt-2 text-sm text-graphite">
            Defaults for new viral clip reels. Each piece can still be changed
            in the editor.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="viral-default-volume">
            Video sound: {Math.round(config.volume * 100)}%
          </Label>
          <input
            id="viral-default-volume"
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(config.volume * 100)}
            onChange={(e) => patch({ volume: Number(e.target.value) / 100 })}
            className="w-full accent-primary sm:max-w-xs"
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Viral clips to use</Label>
          {videos.length === 0 ? (
            <p className="text-sm text-graphite">
              No clips in the library yet. An admin adds them in Admin assets.
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
        {saved ? <p className="text-sm text-graphite">Settings saved.</p> : null}

        <div className="flex justify-end">
          <Button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="rounded-full"
          >
            {saving ? 'Saving…' : 'Save viral settings'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
