import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/**
 * Catch-all 404 view rendered by the `*` route.
 */
export function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-start px-6 py-24">
      <p className="eyebrow text-slate">Page not found</p>
      <h1 className="text-display mt-6 text-balance">This page slipped the frame.</h1>
      <p className="mt-6 max-w-xl text-base leading-relaxed text-graphite">
        The URL you followed leads nowhere in this build. Return home to keep
        browsing the showcase.
      </p>
      <Button asChild className="mt-10 rounded-full px-8">
        <Link to="/">Back to home</Link>
      </Button>
    </section>
  )
}