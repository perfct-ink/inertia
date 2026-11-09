import { useState } from 'react'
import { Activity as ActivityIcon } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import { ActivityDialog } from './ActivityDialog'
import type { ActivitySubjectType } from '@/types'
import './ActivityButton.scss'

type ActivityButtonProps = {
  subjectType: ActivitySubjectType
  subjectId: number
  // The item's name, used in the button's label and the dialog's heading.
  title: string
  className?: string
}

// An icon button that opens an item's activity log. Its icon differs from the clock
// on a task's "Status history" button, which sits beside it.
export function ActivityButton({ subjectType, subjectId, title, className }: ActivityButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    // The dialog renders in a portal, but its clicks still bubble through React to the card or
    // row around this button (which navigate on click), so they stop here.
    <span className="activity_button" onClick={(e) => e.stopPropagation()}>
      <Button
        type="button"
        variant="ghost"
        className={classNames('activity_button-trigger', className)}
        title="Activity"
        aria-label={`Activity of ${title}`}
        onClick={() => setOpen(true)}
      >
        <ActivityIcon className="activity_button-icon" aria-hidden="true" />
      </Button>
      {open && <ActivityDialog subjectType={subjectType} subjectId={subjectId} title={title} onClose={() => setOpen(false)} />}
    </span>
  )
}
