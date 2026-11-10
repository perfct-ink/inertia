import { WifiOff } from 'lucide-react'
import { useOnline } from '@/hooks/useOnline'
import './OfflineIndicator.scss'

// A small notice at the top left while the browser is offline. Nothing shows when online.
// The region is always in the page so a screen reader announces it appearing.
export default function OfflineIndicator() {
  const online = useOnline()
  return (
    <div role="status" aria-live="polite" className="offline_indicator_region">
      {!online && (
        <span className="offline_indicator">
          <WifiOff className="offline_indicator-icon" aria-hidden="true" />
          Offline
        </span>
      )}
    </div>
  )
}
