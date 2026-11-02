import { useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Button, Modal, classNames } from '@/components/ui'
import type { CommentableType } from '@/types'
import { Comments } from './Comments'
import './Comments.scss'

// A comment icon that opens the item's conversation in a dialog. The wrapper
// stops clicks reaching a clickable card the button sits inside (React sends
// events from the dialog up through its parent too).
export function CommentsButton({ type, id, title, className }: { type: CommentableType; id: number; title: string; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="comments-trigger" onClick={(e) => e.stopPropagation()}>
      <Button
        aria-label={`Comments on ${title}`}
        title="Comments"
        className={classNames('comments-button', className)}
        onClick={() => setOpen(true)}
      >
        <MessageSquare className="comments-icon" aria-hidden="true" />
      </Button>
      <Modal open={open} title={`Comments on ${title}`} className="comments-dialog" onClose={() => setOpen(false)}>
        {open && <Comments type={type} id={id} />}
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)}>Close</Button>
        </div>
      </Modal>
    </span>
  )
}
