import { Button, Modal } from '@/components/ui'
import { removedDatesMessage } from '@/data/documentDate'
import type { DocumentDate } from '@/types'

// Asked when a line with a date chip was deleted from the document: should the
// calendar entry go too, or stay on the calendar, unlinked from the document?
// Closing the dialog (Escape) keeps it, the choice that loses nothing.
export default function DocumentDateRemovedDialog({ dates, onKeep, onDelete }: {
  dates: DocumentDate[]
  onKeep: () => void
  onDelete: () => void
}) {
  return (
    <Modal
      open={dates.length > 0}
      title={dates.length > 1 ? 'Delete them from the calendar too?' : 'Delete it from the calendar too?'}
      description={dates.length > 0 ? removedDatesMessage(dates) : undefined}
      onClose={onKeep}
    >
      <div className="ui-modal-actions">
        <Button type="button" variant="secondary" onClick={onKeep}>Keep on the calendar</Button>
        <Button type="button" variant="destructive" onClick={onDelete}>Delete from the calendar</Button>
      </div>
    </Modal>
  )
}
