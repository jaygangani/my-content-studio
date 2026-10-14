import { useEffect, useState } from 'react'
import { GreenScreenManager } from '@/components/features/GreenScreenManager'
import { ViralClipManager } from '@/components/features/ViralClipManager'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { isAdminUser } from '@/services/content'

/** Admin-only stock asset library. More asset types become more tabs. */
export function AdminAssetsPage() {
  const [admin, setAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    void isAdminUser()
      .then(setAdmin)
      .catch(() => setAdmin(false))
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-10">
      <p className="eyebrow text-slate">admin</p>
      <h1 className="text-heading-md mt-3">Stock assets</h1>

      {admin === null ? (
        <p className="mt-8 text-sm text-slate">Loading…</p>
      ) : !admin ? (
        <p className="mt-8 text-sm text-graphite">
          This area is for admins only.
        </p>
      ) : (
        <Tabs defaultValue="greenscreen" className="mt-8">
          <TabsList variant="line" className="w-full justify-start">
            <TabsTrigger value="greenscreen" className="whitespace-nowrap">
              Green screen videos
            </TabsTrigger>
            <TabsTrigger value="viral" className="whitespace-nowrap">
              Viral clips
            </TabsTrigger>
          </TabsList>
          <TabsContent value="greenscreen" className="mt-6">
            <GreenScreenManager />
          </TabsContent>
          <TabsContent value="viral" className="mt-6">
            <ViralClipManager />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
