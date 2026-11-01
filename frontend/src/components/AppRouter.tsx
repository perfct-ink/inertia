import type { ReactNode } from 'react'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { detectRouterKind, type RouterKind } from '@/util/route'

// The one place the router is chosen, so App.tsx keeps a single set of routes.
// The web app runs on real paths; Electron and the iOS app load index.html off
// disk, where a path has nothing to resolve, so they keep a hash router. The
// choice follows the platform at startup (see util/route.ts); `kind` overrides
// it for tests.
export default function AppRouter({ kind = detectRouterKind(), children }: { kind?: RouterKind; children: ReactNode }) {
  return kind === 'hash' ? <HashRouter>{children}</HashRouter> : <BrowserRouter>{children}</BrowserRouter>
}
