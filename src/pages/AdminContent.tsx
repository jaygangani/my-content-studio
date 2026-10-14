import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ContentTypeFlow } from '@/components/features/ContentTypeFlow'
import { PromptManager } from '@/components/features/PromptManager'
import { StockLibrary } from '@/components/features/StockLibrary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isAdminUser } from '@/services/content'

const TABS = ['formats', 'library', 'prompts'] as const

/** Admin home: formats by content type, the stock library, and prompts. */
export function AdminContentPage() {
  const [admin, setAdmin] = useState<boolean | null>(null)
  const [params, setParams] = useSearchParams()
  const requested = params.get('tab') ?? 'formats'
  const tab = (TABS as readonly string[]).includes(requested) ? requested : 'formats'

  useEffect(() => {
    void isAdminUser()
      .then(setAdmin)
      .catch(() => setAdmin(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="eyebrow text-slate">admin</p>
      <h1 className="text-heading-md mt-3">Content setup</h1>

      {admin === null ? (
        <p className="mt-8 text-sm text-slate">Loading…</p>
      ) : !admin ? (
        <p className="mt-8 text-sm text-graphite">This area is for admins only.</p>
      ) : (
        <Tabs
          value={tab}
          onValueChange={(next) => setParams({ tab: next })}
          className="mt-8"
        >
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="formats" className="whitespace-nowrap">
              Formats
            </TabsTrigger>
            <TabsTrigger value="library" className="whitespace-nowrap">
              Stock library
            </TabsTrigger>
            <TabsTrigger value="prompts" className="whitespace-nowrap">
              Prompts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="formats" className="mt-6">
            <ContentTypeFlow />
          </TabsContent>
          <TabsContent value="library" className="mt-6">
            <StockLibrary />
          </TabsContent>
          <TabsContent value="prompts" className="mt-6">
            <PromptManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
