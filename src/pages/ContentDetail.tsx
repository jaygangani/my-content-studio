import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ContentRenderer } from '@/components/features/ContentRenderer'
import { formatEnum, getContent } from '@/services/content'
import type { ContentItem } from '@/services/content'

/**
 * Content detail / render screen: plays the Pexels source video with the
 * saved overlay timeline and renders a downloadable file with overlays burned
 * in.
 */
export function ContentDetailPage() {
  const { appId = '', contentId = '' } = useParams()
  const [content, setContent] = useState<ContentItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContent = useCallback(async () => {
    setError(null)
    try {
      setContent(await getContent(contentId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load content')
    } finally {
      setLoading(false)
    }
  }, [contentId])

  useEffect(() => {
    void loadContent()
  }, [loadContent])

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <Link
        to={`/apps/${appId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Back to app
      </Link>

      {loading ? (
        <p className="mt-12 text-sm text-slate">Loading…</p>
      ) : error ? (
        <p className="mt-12 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : !content ? (
        <p className="mt-12 text-sm text-graphite">
          This content item could not be found.
        </p>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {content.status ? (
              <span className="rounded-full border border-hairline px-3 py-1 text-xs text-graphite">
                {formatEnum(content.status)}
              </span>
            ) : null}
            {content.type ? (
              <span className="rounded-full border border-hairline px-3 py-1 text-xs text-graphite">
                {formatEnum(content.type)}
              </span>
            ) : null}
          </div>

          <div className="mt-8">
            <ContentRenderer content={content} />
          </div>
        </>
      )}
    </div>
  )
}
