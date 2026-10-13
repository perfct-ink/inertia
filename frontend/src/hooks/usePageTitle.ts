import { useEffect } from 'react'

const APP_NAME = 'Inertia'

// Sets the browser/tab title for the current view: "Tasks · Inertia".
// Pass undefined while the title is still loading to keep the app name only.
export function usePageTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => { document.title = APP_NAME }
  }, [title])
}
