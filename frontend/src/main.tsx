// Must load first: it declares the cascade layer order (libraries, app, view).
import '@/styles/app.scss'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import App from './App'
import TitleBarDragRegion from '@/components/TitleBarDragRegion'
import { cleanPath, usesHashRouter } from '@/util/router'

// The native Mac shell registers this message handler before the page loads.
const macShell = Boolean((window as { webkit?: { messageHandlers?: { inertiaSession?: unknown } } }).webkit?.messageHandlers?.inertiaSession)
const hashRouter = usesHashRouter(window.location, macShell)
if (!hashRouter) {
  // Old `/#/...` and `/index.html` links land on their clean path once.
  const path = cleanPath(window.location)
  if (path) window.history.replaceState(null, '', path)
}
const Router = hashRouter ? HashRouter : BrowserRouter

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,        // data considered fresh for 60s — no refetch on re-focus/remount
      gcTime: 5 * 60_000,       // keep unused cache for 5 min
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router>
        <TitleBarDragRegion />
        <App />
      </Router>
    </QueryClientProvider>
  </React.StrictMode>
)
