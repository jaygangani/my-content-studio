import { useEffect, useState } from 'react'
import { Loader2, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { listApps } from '@/services/apps'
import type { AppItem } from '@/services/apps'
import { testGenerate } from '@/services/content'
import type { TestGenerateResult } from '@/services/content'
import type { FormatDef } from '@/services/formats'

interface TestGeneratePanelProps {
  formats: FormatDef[]
  /** When set, the format is fixed; otherwise a picker is shown. */
  formatId?: number
}

const selectClass =
  'h-10 rounded-md border border-hairline-strong bg-surface-card px-3 text-sm text-ink'

/** Runs one format against an app. Nothing is saved, limits are untouched. */
export function TestGeneratePanel({ formats, formatId }: TestGeneratePanelProps) {
  const [apps, setApps] = useState<AppItem[]>([])
  const [appId, setAppId] = useState('')
  const [picked, setPicked] = useState<number | null>(formatId ?? null)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<TestGenerateResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void listApps()
      .then((list) => {
        setApps(list)
        setAppId((current) => current || list[0]?.id || '')
      })
      .catch(() => setApps([]))
  }, [])

  useEffect(() => {
    if (formatId !== undefined) setPicked(formatId)
    setResult(null)
    setError(null)
  }, [formatId])

  const target = formatId ?? picked

  const run = async () => {
    if (target === null || !appId) return
    setRunning(true)
    setResult(null)
    setError(null)
    try {
      setResult(await testGenerate(target, appId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-hairline-soft p-4">
      <span className="text-sm font-medium text-ink">Test generate</span>
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="test-app" className="text-[13px] text-graphite">
            App
          </Label>
          <select
            id="test-app"
            value={appId}
            onChange={(e) => setAppId(e.target.value)}
            className={selectClass}
          >
            {apps.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>
        {formatId === undefined ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="test-format" className="text-[13px] text-graphite">
              Format
            </Label>
            <select
              id="test-format"
              value={picked ?? ''}
              onChange={(e) => setPicked(Number(e.target.value))}
              className={selectClass}
            >
              <option value="">Choose a format</option>
              {formats.map((format) => (
                <option key={format.id} value={format.formatId}>
                  #{format.formatId} {format.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <Button
          type="button"
          variant="outline"
          disabled={running || target === null || !appId}
          onClick={() => void run()}
          className="h-10 rounded-full px-5"
        >
          {running ? <Loader2 className="animate-spin" /> : <Play />}
          {running ? 'Running…' : 'Run test'}
        </Button>
      </div>
      <p className="text-[13px] text-stone">
        Uses the app&apos;s profile and calls the AI once. Nothing is saved and
        the daily limit is not used.
      </p>

      {error ? <p className="text-sm text-ink">{error}</p> : null}
      {result ? (
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-graphite">
            {result.ok ? 'Output' : 'Failed'}
            {result.tokens ? ` · ${result.tokens} tokens` : ''}
            {typeof result.cost === 'number'
              ? ` · $${result.cost.toFixed(5)}`
              : ''}
            {result.persona ? ` · ${result.persona}` : ''}
            {result.feature ? ` · ${result.feature}` : ''}
            {result.pillar ? ` · ${result.pillar}` : ''}
            {result.video ? ` · clip: ${result.video}` : ''}
          </p>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-hairline bg-canvas-soft p-3 font-mono text-[12px] leading-relaxed text-ink">
            {result.error
              ? result.error
              : result.skipped
                ? `Skipped: ${result.skipped}`
                : JSON.stringify(result.payload, null, 2)}
          </pre>
        </div>
      ) : null}
    </div>
  )
}
