import { format, parseISO } from 'date-fns'
import { Loader2 } from 'lucide-react'
import { Button, FormError, Modal } from '@/components/ui'
import { useActivities } from '@/api/activities'
import { ACTIVITY_LIMIT, activityActor, activityLines } from '@/data/activity'
import type { ActivitySubjectType } from '@/types'
import './ActivityDialog.scss'

type ActivityDialogProps = {
  subjectType: ActivitySubjectType
  subjectId: number
  // The item's name, shown in the dialog's heading.
  title: string
  onClose: () => void
}

// An item's activity log: who created or changed it and when, newest first.
// Mount it only while open; it loads the log when it mounts.
export function ActivityDialog({ subjectType, subjectId, title, onClose }: ActivityDialogProps) {
  const { data: activities = [], isLoading, isError } = useActivities(subjectType, subjectId)

  return (
    <Modal open title={`Activity: ${title}`} onClose={onClose}>
      <div className="activity_log">
        {isLoading && <Loader2 className="activity_log-spinner" aria-label="Loading activity" />}
        <FormError message={isError ? 'Unable to load the activity. Close this and try again.' : null} />
        {!isLoading && !isError && activities.length === 0 && (
          <p className="activity_log-hint">No activity recorded yet. Changes made before the log was kept are not listed.</p>
        )}
        {activities.length > 0 && (
          <ol className="activity_log-list" aria-label="Activity, newest first">
            {activities.map((activity) => (
              <li key={activity.id} className="activity_log-entry">
                <p className="activity_log-meta">
                  <span className="activity_log-actor">{activityActor(activity)}</span>
                  <time dateTime={activity.created_at}>{format(parseISO(activity.created_at), 'MMM d, yyyy h:mm a')}</time>
                </p>
                <ul className="activity_log-lines">
                  {activityLines(activity, subjectType).map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
                </ul>
              </li>
            ))}
          </ol>
        )}
        {activities.length >= ACTIVITY_LIMIT && <p className="activity_log-hint">Showing the latest {ACTIVITY_LIMIT} entries.</p>}
      </div>
      <div className="ui-modal-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
