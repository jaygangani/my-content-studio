import { lazy } from 'react'
import type { ComponentType, LazyExoticComponent, ReactElement } from 'react'
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import { useAuthenticator } from '@aws-amplify/ui-react'
import { AppHeader } from '@/components/common/AppHeader'
import { LoginPage } from '@/pages/Login'

interface RouteEntry {
  path: string
  component: LazyExoticComponent<ComponentType>
}

/* Route-level code splitting — each page loads on first navigation. */
const routes: RouteEntry[] = [
  {
    path: '/home',
    component: lazy(() =>
      import('@/pages/Home').then((module) => ({ default: module.HomePage })),
    ),
  },
  {
    path: '/apps',
    component: lazy(() =>
      import('@/pages/Apps').then((module) => ({ default: module.AppsPage })),
    ),
  },
  {
    path: '/apps/:appId',
    component: lazy(() =>
      import('@/pages/AppDetail').then((module) => ({
        default: module.AppDetailPage,
      })),
    ),
  },
  {
    path: '/apps/:appId/content/:contentId',
    component: lazy(() =>
      import('@/pages/ContentDetail').then((module) => ({
        default: module.ContentDetailPage,
      })),
    ),
  },
  {
    path: '*',
    component: lazy(() =>
      import('@/pages/NotFound').then((module) => ({
        default: module.NotFoundPage,
      })),
    ),
  },
]

/**
 * Guards private routes.
 * - While the session is restoring, render nothing (prevents a premature
 *   redirect that would drop the user's intended path on reload).
 * - Unauthenticated users are sent to `/login`, remembering where they were.
 */
function ProtectedShell(): ReactElement {
  const { authStatus } = useAuthenticator((context) => [context.authStatus])
  const location = useLocation()

  if (authStatus === 'configuring') {
    return <></>
  }

  if (authStatus !== 'authenticated') {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}

/** Typed render of all application routes. Wrap in `<Suspense>` at the shell. */
export function AppRoutes(): ReactElement {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route element={<ProtectedShell />}>
        {routes.map((route) => (
          <Route
            key={route.path}
            path={route.path}
            element={<route.component />}
          />
        ))}
      </Route>
    </Routes>
  )
}