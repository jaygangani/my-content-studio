import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { AppConfigPanel } from '@/components/features/AppConfigPanel'
import { AppLogo } from '@/components/features/AppLogo'
import { ContentPanel } from '@/components/features/ContentPanel'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getApp } from '@/services/apps'
import type { AppItem } from '@/services/apps'

/**
 * App detail page with vertical tabs: `content` (CRUD in a drawer) and
 * `configurations` (edit name, description, logo).
 */
export function AppDetailPage() {
  const { appId = '' } = useParams()
  const [app, setApp] = useState<AppItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadApp = useCallback(async () => {
    setError(null)
    try {
      setApp(await getApp(appId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    void loadApp()
  }, [loadApp])

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-16">
      <Link
        to="/apps"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" /> Apps
      </Link>

      {loading ? (
        <p className="mt-12 text-sm text-slate">Loading…</p>
      ) : error ? (
        <p className="mt-12 rounded-lg border border-hairline-soft bg-hairline/60 px-4 py-3 text-sm text-ink">
          {error}
        </p>
      ) : !app ? (
        <p className="mt-12 text-sm text-graphite">
          This app could not be found.
        </p>
      ) : (
        <>
          <header className="mt-8 flex items-center gap-5">
            <AppLogo
              value={app.logo ?? ''}
              alt={`${app.name} logo`}
              className="size-14 rounded-lg bg-surface-cool object-contain"
            />
            <div>
              <p className="eyebrow text-slate">app</p>
              <h1 className="text-heading-md mt-3">{app.name}</h1>
              {app.description ? (
                <p className="mt-2 max-w-xl text-base leading-relaxed text-graphite">
                  {app.description}
                </p>
              ) : null}
            </div>
          </header>

          <Tabs
            defaultValue="content"
            orientation="vertical"
            className="mt-14 items-start gap-10"
          >
            <TabsList variant="line" className="w-44 shrink-0 flex-col items-stretch">
              <TabsTrigger value="content" className="justify-start">
                Content
              </TabsTrigger>
              <TabsTrigger value="configurations" className="justify-start">
                Configurations
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="w-full">
              <ContentPanel appId={app.id} />
            </TabsContent>

            <TabsContent value="configurations" className="w-full">
              <AppConfigPanel app={app} onSaved={setApp} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
