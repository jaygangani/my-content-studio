import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Check, Pencil, RefreshCw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AppLogo } from '@/components/features/AppLogo'
import { PieceEditor } from '@/components/features/PieceEditor'
import type { PieceEditorHandle } from '@/components/features/PieceEditor'
import { PiecePreview } from '@/components/features/PiecePreview'
import { Button } from '@/components/ui/button'
import { useBrandAssets } from '@/hooks/useBrandAssets'
import { useSwipe } from '@/hooks/useSwipe'
import type { SwipeDirection } from '@/hooks/useSwipe'
import { listApps } from '@/services/apps'
import type { AppItem } from '@/services/apps'
import { listAssets } from '@/services/assets'
import type { AssetItem } from '@/services/assets'
import {
  approveContent,
  discardContent,
  listDrafts,
  regenerateContent,
} from '@/services/content'
import type { ContentItem } from '@/services/content'
import { parseScript, scriptCaption, scriptHashtags } from '@/types/script'
import type { PieceScript, TextRole } from '@/types/script'

/** Swipe feed: review drafts one at a time. Right approves, left discards. */
export function FeedPage() {
  const [params, setParams] = useSearchParams()
  const appFilter = params.get('app') ?? ''
  const [apps, setApps] = useState<AppItem[]>([])
  const [drafts, setDrafts] = useState<ContentItem[]>([])
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [script, setScript] = useState<PieceScript | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [selectedRole, setSelectedRole] = useState<TextRole>('hook')
  const [frameIndex, setFrameIndex] = useState(0)
  const editorRef = useRef<PieceEditorHandle | null>(null)
  const [preview, setPreview] = useState<{
    script: PieceScript
    assets: AssetItem[]
  } | null>(null)

  const visible = useMemo(
    () => (appFilter ? drafts.filter((d) => d.appId === appFilter) : drafts),
    [drafts, appFilter],
  )
  const current = visible[0] ?? null
  const currentApp = apps.find((a) => a.id === current?.appId)
  const brandAssets = useBrandAssets(current?.appId, currentApp?.logo)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [appList, draftList] = await Promise.all([listApps(), listDrafts()])
      setApps(appList)
      setDrafts(draftList)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const currentId = current?.id
  const currentScriptJson = current?.scriptJson
  useEffect(() => {
    if (!currentId) {
      setScript(null)
      setAssets([])
      return
    }
    let cancelled = false
    setScript(parseScript(currentScriptJson))
    void listAssets(currentId)
      .then((list) => {
        if (!cancelled) setAssets(list)
      })
      .catch(() => {
        if (!cancelled) setAssets([])
      })
    return () => {
      cancelled = true
    }
  }, [currentId, currentScriptJson])

  const decide = useCallback(
    async (direction: SwipeDirection) => {
      if (!currentId || busy) return
      setBusy(true)
      setError(null)
      try {
        if (direction === 'right') await approveContent(currentId)
        else await discardContent(currentId)
        setDrafts((list) => list.filter((d) => d.id !== currentId))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed')
      } finally {
        setBusy(false)
      }
    },
    [currentId, busy],
  )

  const handleRegenerate = async () => {
    if (!currentId || busy) return
    setBusy(true)
    setError(null)
    try {
      const result = await regenerateContent(currentId)
      setDrafts((list) =>
        list.map((d) => (d.id === currentId ? result.piece : d)),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Regenerate failed')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (editing) return
      const target = event.target as HTMLElement
      if (target.closest('input, textarea')) return
      if (event.key === 'ArrowRight') void decide('right')
      if (event.key === 'ArrowLeft') void decide('left')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [decide, editing])

  const { dx, bind } = useSwipe((direction) => void decide(direction), !editing)

  return (
    <div
      className={cn(
        'mx-auto w-full px-4 py-6 sm:px-6 sm:py-10',
        editing ? 'max-w-5xl' : 'max-w-xl',
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-slate">review</p>
          <h1 className="text-heading-md mt-3">Feed</h1>
        </div>
        <select
          value={appFilter}
          onChange={(e) =>
            setParams(e.target.value ? { app: e.target.value } : {})
          }
          aria-label="Filter by app"
          className="h-10 rounded-md border border-hairline-strong bg-surface-card px-4 text-sm text-ink"
        >
          <option value="">All apps</option>
          {apps.map((app) => (
            <option key={app.id} value={app.id}>
              {app.name}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-slate">Loading…</p>
      ) : !current ? (
        <div className="mt-16 text-center">
          <h2 className="text-heading-sm">Nothing to review</h2>
          <p className="mt-3 text-sm text-graphite">
            Generate a piece from an app&apos;s Content tab.
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link to="/apps">Go to apps</Link>
          </Button>
        </div>
      ) : (
        <div
          className={cn(
            'mt-8',
            editing && 'grid items-start gap-10 md:grid-cols-[minmax(0,420px)_1fr]',
          )}
        >
        <div
          {...bind}
          style={{
            transform: `translateX(${dx}px) rotate(${dx / 40}deg)`,
            touchAction: 'pan-y',
          }}
          className="select-none"
        >
          <div className="mb-4 flex items-center gap-3">
            <AppLogo
              value={currentApp?.logo ?? ''}
              alt={`${currentApp?.name ?? 'App'} logo`}
              className="size-9 rounded-md bg-surface-cool object-contain"
            />
            <div>
              <p className="text-sm font-semibold text-ink">
                {currentApp?.name ?? 'App'}
              </p>
              <p className="text-[13px] text-stone">
                #{current.formatId} {parseScriptName(script)} ·{' '}
                {current.igFormat ?? '—'}
              </p>
            </div>
            <span className="ml-auto text-sm text-graphite">
              {visible.length} left
            </span>
          </div>

          {script ? (
            <PiecePreview
              script={editing && preview ? preview.script : script}
              assets={editing && preview ? preview.assets : assets}
              brandAssets={brandAssets}
              editable={editing}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              onFrameChange={setFrameIndex}
              onMoveRole={(role, x, y) =>
                editorRef.current?.moveRole(role, x, y)
              }
            />
          ) : (
            <p className="text-sm text-graphite">This draft has no script.</p>
          )}

          {script ? (
            <div className="mt-6">
              <p className="text-sm leading-relaxed text-ink">
                {scriptCaption(script)}
              </p>
              <p className="mt-2 text-[13px] text-stone">
                {scriptHashtags(script).join(' ')}
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void decide('left')}
              className="h-11 rounded-full px-4 sm:px-5"
            >
              <X /> Discard
            </Button>
            <Button
              variant="outline"
              disabled={busy || !script}
              onClick={() => setEditing(true)}
              className="h-11 rounded-full px-4 sm:px-5"
            >
              <Pencil /> Edit
            </Button>
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void handleRegenerate()}
              className="h-11 rounded-full px-4 sm:px-5"
            >
              <RefreshCw /> Regenerate
            </Button>
            <Button
              disabled={busy}
              onClick={() => void decide('right')}
              className="h-11 rounded-full px-4 sm:px-5"
            >
              <Check /> Approve
            </Button>
          </div>
          <p className="mt-4 text-center text-[13px] text-stone">
            Swipe right to approve, left to discard. Arrow keys work too.
          </p>
        </div>

        {editing && script ? (
          <PieceEditor
            ref={editorRef}
            brandAssets={brandAssets}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            frameIndex={frameIndex}
            piece={current}
            script={script}
            assets={assets}
            onClose={() => {
              setEditing(false)
              setPreview(null)
            }}
            onPreview={(nextScript, nextAssets) =>
              setPreview({ script: nextScript, assets: nextAssets })
            }
            onSaved={(piece, nextScript, nextAssets) => {
              setDrafts((list) =>
                list.map((d) => (d.id === piece.id ? piece : d)),
              )
              setScript(nextScript)
              setAssets(nextAssets)
            }}
          />
        ) : null}
        </div>
      )}
    </div>
  )
}

function parseScriptName(script: PieceScript | null): string {
  return script?.formatName ?? ''
}
