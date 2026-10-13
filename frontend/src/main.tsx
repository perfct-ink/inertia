// Must load first: it declares the cascade layer order (libraries, app, view).
import '@/styles/app.scss'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { HashRouter } from 'react-router-dom'
import App from './App'
import TitleBarDragRegion from '@/components/TitleBarDragRegion'

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
      <HashRouter>
        <TitleBarDragRegion />
        <App />
      </HashRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
