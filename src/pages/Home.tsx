/**
 * Home page — intentionally minimal, single line of text.
 */
export function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center gap-3 px-6 py-32 bg-background">
      <p className="eyebrow text-slate">home</p>
      <p className="text-base text-ink">frontend init</p>
    </main>
  )
}