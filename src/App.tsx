import { Suspense } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import { AppRoutes } from '@/routes'

/**
 * Application root: auth provider enables auth-aware routing (`useAuthenticator`)
 * at any level; `/login` is public, everything else is guarded.
 */
export default function App() {
  return (
    <Authenticator.Provider>
      <BrowserRouter>
        <Suspense fallback={null}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </Authenticator.Provider>
  )
}