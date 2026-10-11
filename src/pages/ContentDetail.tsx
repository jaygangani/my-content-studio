import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Copy, Download, FileText, Loader2, Pencil } from 'lucide-react'
import { PieceEditor } from '@/components/features/PieceEditor'
import type { PieceEditorHandle } from '@/components/features/PieceEditor'
import { PiecePreview } from '@/components/features/PiecePreview'
import { Button } from '@/components/ui/button'
import { captionBlock, exportBaseName, exportPiece } from '@/lib/export'
import { getApp } from '@/services/apps'
import type { AppItem } from '@/services/apps'
import { listAssets } from '@/services/assets'
import type { AssetItem } from '@/services/assets'
import { formatEnum, getContent } from '@/services/content'
import type { ContentItem } from '@/services/content'
import { parseScript } from '@/types/script'
import type { PieceScript, TextRole } from '@/types/script'

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

/** Piece detail: preview, caption block and in-browser export. */
export function ContentDetailPage() {
  const { appId = '', contentId = '' } = useParams()
  const [piece, setPiece] = useState<ContentItem | null>(null)
  const [app, setApp] = useState<AppItem | null>(null)
  const [script, setScript] = useState<PieceScript | null>(null)
  const [assets, setAssets] = useState<AssetItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedRole, setSelectedRole] = useState<TextRole>('hook')
  const [frameIndex, setFrameIndex] = useState(0)
  const editorRef = useRef<PieceEditorHandle | null>(null)
  const [preview, setPreview] = useState<{
    script: PieceScript
    assets: AssetItem[]
  } | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [item, appItem, assetList] = await Promise.all([
        getContent(contentId),
        getApp(appId),
        listAssets(contentId),
      ])
      setPiece(item)
      setApp(appItem)
      setAssets(assetList)
      setScript(item ? parseScript(item.scriptJson) : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [appId, contentId])

  useEffect(() => {
    void load()
  }, [load])

  const approved = piece?.status === 'APPROVED'
  const exporting = progress !== null

  const handleExport = async () => {
    if (!script || !app) return
    setProgress(0)
    setError(null)
    try {
      const result = await exportPiece(app.name, script, assets, setProgress)
      download(result.blob, result.filename)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setProgress(null)
    }
  }

  const handleCopy = async () => {
    if (!script) return
    await navigator.clipboard.writeText(captionBlock(script))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  const handleCaptionFile = () => {
    if (!script || !app) return
    download(
      new Blob([captionBlock(script)], { type: 'text/plain' }),
      `${exportBaseName(app.name, script)}-caption.txt`,
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/apps/${appId}`}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-4" /> Back to app
        </Link>
        {piece?.status ? (
          <span className="rounded-full border border-hairline px-3 py-1 text-xs text-graphite">
            {formatEnum(piece.status)}
          </span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-6 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-8 text-sm text-slate">Loading…</p>
      ) : !piece ? (
        <p className="mt-8 text-sm text-graphite">
          This content item could not be found.
        </p>
      ) : !script ? (
        <p className="mt-8 text-sm text-graphite">
          This item has no generated script.
        </p>
      ) : (
        <div className="mt-6 grid gap-8 sm:mt-8 md:grid-cols-[360px_1fr] md:gap-10">
          <PiecePreview
            script={editing && preview ? preview.script : script}
            assets={editing && preview ? preview.assets : assets}
            editable={editing}
            selectedRole={selectedRole}
            onSelectRole={setSelectedRole}
            onFrameChange={setFrameIndex}
            onMoveRole={(role, x, y) => editorRef.current?.moveRole(role, x, y)}
          />

          {editing ? (
            <PieceEditor
              ref={editorRef}
              selectedRole={selectedRole}
              onSelectRole={setSelectedRole}
              frameIndex={frameIndex}
              piece={piece}
              script={script}
              assets={assets}
              onClose={() => {
                setEditing(false)
                setPreview(null)
              }}
              onPreview={(nextScript, nextAssets) =>
                setPreview({ script: nextScript, assets: nextAssets })
              }
              onSaved={(updated, nextScript, nextAssets) => {
                setPiece(updated)
                setScript(nextScript)
                setAssets(nextAssets)
              }}
            />
          ) : (
          <div className="flex flex-col gap-6">
            <div>
              <p className="eyebrow text-slate">
                #{script.formatId} {script.formatName}
              </p>
              <h1 className="text-heading-md mt-3">{piece.title}</h1>
            </div>

            <pre className="whitespace-pre-wrap rounded-lg border border-hairline-soft p-4 font-sans text-sm leading-relaxed text-ink">
              {captionBlock(script)}
            </pre>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => void handleCopy()}
                className="h-10 rounded-full px-5"
              >
                <Copy /> {copied ? 'Copied' : 'Copy caption'}
              </Button>
              <Button
                variant="outline"
                onClick={handleCaptionFile}
                className="h-10 rounded-full px-5"
              >
                <FileText /> Caption file
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(true)}
                className="h-10 rounded-full px-5"
              >
                <Pencil /> Edit
              </Button>
              <Button
                disabled={!approved || exporting}
                onClick={() => void handleExport()}
                className="h-10 rounded-full px-5"
              >
                {exporting ? <Loader2 className="animate-spin" /> : <Download />}
                {exporting
                  ? `Exporting ${Math.round((progress ?? 0) * 100)}%`
                  : 'Export'}
              </Button>
            </div>
            {!approved ? (
              <p className="text-sm text-graphite">
                Only approved pieces can be exported. Approve it in the feed.
              </p>
            ) : null}
          </div>
          )}
        </div>
      )}
    </div>
  )
}
