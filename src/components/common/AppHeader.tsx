import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuthenticator } from '@aws-amplify/ui-react'
import logo from '@/assets/logo.png'
import { Button } from '@/components/ui/button'
import { isAdminUser } from '@/services/content'

/**
 * Persistent header for authenticated pages: brand, home link, sign out.
 */
export function AppHeader() {
  const { signOut } = useAuthenticator((context) => [context.signOut])
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    void isAdminUser()
      .then(setAdmin)
      .catch(() => setAdmin(false))
  }, [])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-background/90 px-4 backdrop-blur-sm sm:px-6">
      <Link to="/apps" className="flex items-center gap-3">
        <img src={logo} alt="mycontentstudio logo" className="size-7 rounded-sm" />
        <span className="hidden text-lg font-semibold tracking-tight text-ink sm:inline">
          mycontentstudio
        </span>
      </Link>

      <nav className="flex items-center gap-1 sm:gap-3">
        <Link
          to="/feed"
          className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft sm:px-4 transition-colors hover:text-ink"
        >
          Feed
        </Link>
        <Link
          to="/apps"
          className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft sm:px-4 transition-colors hover:text-ink"
        >
          Apps
        </Link>
        {admin ? (
          <Link
            to="/admin/content"
            className="rounded-full px-3 py-2 text-sm font-medium text-ink-soft sm:px-4 transition-colors hover:text-ink"
          >
            Admin
          </Link>
        ) : null}
        <Button onClick={() => signOut?.()} className="h-9 rounded-full px-4 sm:px-5">
          Sign out
        </Button>
      </nav>
    </header>
  )
}