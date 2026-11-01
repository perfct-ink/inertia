// Must load first: it declares the cascade layer order (libraries, app, view).
import '@/styles/app.scss'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import AppRouter from '@/components/AppRouter'
import TitleBarDragRegion from '@/components/TitleBarDragRegion'
import { redirectLegacyUrl } from '@/util/route'

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

// Old /#/route links and /index.html become the equivalent path before the
// router reads the address (web only; the hash-router shells are untouched).
redirectLegacyUrl()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter>
        <TitleBarDragRegion />
        <App />
      </AppRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
