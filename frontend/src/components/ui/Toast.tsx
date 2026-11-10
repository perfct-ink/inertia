import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { useNotificationStore, type Notification } from '@/store/notifications'
import { Button } from './Button'
import './Toast.scss'

const AUTO_DISMISS_MS = 8000

function Toast({ notification }: { notification: Notification }) {
  const dismiss = useNotificationStore((s) => s.dismiss)
  // WCAG 2.2.1: a notice stays while the pointer is over it or focus is inside it, and
  // goes the full time after that.
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const held = hovered || focused
  useEffect(() => {
    if (held) return
    const timer = setTimeout(() => dismiss(notification.id), AUTO_DISMISS_MS)
    return () => clearTimeout(timer)
  }, [dismiss, notification.id, held])
  return (
    <div
      role="alert"
      className="ui-toast"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setFocused(false) }}
    >
      <p className="ui-toast-message">{notification.message}</p>
      <Button variant="ghost" aria-label="Dismiss" className="ui-toast-dismiss" onClick={() => dismiss(notification.id)}>
        <X className="ui-toast-icon" />
      </Button>
    </div>
  )
}

// Mount once near the app root; shows errors pushed to the notification store.
export function ToastRegion() {
  const notifications = useNotificationStore((s) => s.notifications)
  if (notifications.length === 0) return null
  return (
    <div role="region" aria-label="Notifications" className="ui-toast_region">
      {notifications.map((n) => <Toast key={n.id} notification={n} />)}
    </div>
  )
}
