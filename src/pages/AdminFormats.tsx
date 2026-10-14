import { useEffect, useState } from 'react'
import { FormatManager } from '@/components/features/FormatManager'
import { PromptManager } from '@/components/features/PromptManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isAdminUser } from '@/services/content'

/** Admin-only editor for the format catalog and every AI prompt. */
export function AdminFormatsPage() {
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    void isAdminUser()
      .then(setAdmin)
      .catch(() => setAdmin(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="eyebrow text-slate">admin</p>
      <h1 className="text-heading-md mt-3">Formats and prompts</h1>

      {admin === null ? (
        <p className="mt-8 text-sm text-slate">Loading…</p>
      ) : !admin ? (
        <p className="mt-8 text-sm text-graphite">
          This area is for admins only.
        </p>
      ) : (
        <Tabs defaultValue="formats" className="mt-8">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="formats" className="whitespace-nowrap">
              Formats
            </TabsTrigger>
            <TabsTrigger value="prompts" className="whitespace-nowrap">
              Prompts
            </TabsTrigger>
          </TabsList>
          <TabsContent value="formats" className="mt-6">
            <FormatManager />
          </TabsContent>
          <TabsContent value="prompts" className="mt-6">
            <PromptManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
