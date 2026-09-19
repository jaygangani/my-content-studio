import { Link } from 'react-router-dom'
import { useAuthenticator } from '@aws-amplify/ui-react'
import logo from '@/assets/logo.png'
import { Button } from '@/components/ui/button'

/**
 * Persistent header for authenticated pages: brand, home link, sign out.
 */
export function AppHeader() {
  const { signOut } = useAuthenticator((context) => [context.signOut])

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-hairline bg-background/90 px-6 backdrop-blur-sm">
      <Link to="/home" className="flex items-center gap-3">
        <img src={logo} alt="mycontentstudio logo" className="size-7 rounded-sm" />
        <span className="text-lg font-semibold tracking-tight text-ink">
          mycontentstudio
        </span>
      </Link>

      <nav className="flex items-center gap-3">
        <Link
          to="/home"
          className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Home
        </Link>
        <Link
          to="/apps"
          className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Apps
        </Link>
        <Button onClick={() => signOut?.()} className="h-9 rounded-full px-5">
          Sign out
        </Button>
      </nav>
    </header>
  )
}