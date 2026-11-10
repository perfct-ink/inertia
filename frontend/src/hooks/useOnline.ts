import { useSyncExternalStore } from 'react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

// Whether the browser says it has a network connection. It can be wrong the other way
// (connected to a network that goes nowhere), so failed requests are still handled.
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true)
}
