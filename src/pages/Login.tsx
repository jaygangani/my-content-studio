import { Authenticator, useAuthenticator } from '@aws-amplify/ui-react'
import { Navigate, useLocation } from 'react-router-dom'
import logo from '@/assets/logo.png'

interface LoginLocationState {
  from?: string
}

/**
 * Public `/login` route. Already-authenticated visitors return to the page
 * they were trying to reach, or home by default.
 */
export function LoginPage() {
  const { authStatus } = useAuthenticator((context) => [context.authStatus])
  const location = useLocation()
  const from = (location.state as LoginLocationState | null)?.from ?? '/home'

  if (authStatus === 'authenticated') {
    return <Navigate to={from} replace />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background p-4">
      <img src={logo} alt="mycontentstudio logo" className="size-14 rounded-lg" />
      <span className="text-lg font-semibold tracking-tight text-ink">
        mycontentstudio
      </span>
      <Authenticator loginMechanisms={['email']} hideSignUp={false} />
    </main>
  )
}