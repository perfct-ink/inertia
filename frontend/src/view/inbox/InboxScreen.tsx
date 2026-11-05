import { useNavigate } from 'react-router-dom'
import { Bell, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications } from '@/api/notifications'
import { notificationAge, notificationPath } from '@/data/notification'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { AppNotification } from '@/types'
import '../planning/PlanningScreen.scss'

// Your inbox: things that need you (so far, tasks assigned to you), newest
// first. Opening one marks it read and goes to what it is about.
export default function InboxScreen() {
  usePageTitle('Inbox')
  const navigate = useNavigate()
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()
  const notifications = data?.notifications ?? []
  const unread = data?.unread_count ?? 0

  function open(notification: AppNotification) {
    if (!notification.read_at) markRead.mutate(notification.id)
    const path = notificationPath(notification.subject_type, notification.subject_id)
    if (path) navigate(path)
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-inbox">
        <div className="planning-header">
          <h1 className="planning-title">Inbox</h1>
          <Button onClick={() => markAll.mutate()} disabled={unread === 0 || markAll.isPending}>Mark all read</Button>
        </div>
        <div className="planning-body">
          <div className="planning-list">
            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
            {!isLoading && notifications.length === 0 && (
              <div className="planning-empty">
                <Bell className="planning-empty_icon" aria-hidden="true" />
                <p>Nothing here yet. You&rsquo;ll see things that need you, like tasks assigned to you.</p>
              </div>
            )}
            {notifications.map((notification) => (
              <Button
                key={notification.id}
                variant="unstyled"
                className="planning-card"
                aria-label={`${notification.read_at ? '' : 'Unread: '}${notification.title}`}
                onClick={() => open(notification)}
              >
                <span className="planning-card-title">{notification.title}</span>
                {notification.body && <span className="planning-description">{notification.body}</span>}
                <span className="planning-date">{notificationAge(notification)}</span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
