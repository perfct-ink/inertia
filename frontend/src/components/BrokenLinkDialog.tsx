import { Button, Modal } from '@/components/ui'
import { brokenLinkMessage } from '@/data/brokenLink'
import type { BrokenLink } from '@/hooks/useBrokenLinks'
import './BrokenLinkDialog.scss'

// What a click on a broken link opens: says what is gone and offers the two
// ways out. "Pick a new target" hands over to the heading link picker; "Remove
// link" keeps the text and drops the link. Cancel comes first so that Enter on
// open does nothing destructive.
export default function BrokenLinkDialog({ link, onPickTarget, onRemove, onClose }: {
  // The broken link to fix; null keeps the dialog closed.
  link: BrokenLink | null
  onPickTarget: () => void
  onRemove: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={link !== null}
      title="This link is broken"
      description={link ? brokenLinkMessage(link.reason) : undefined}
      onClose={onClose}
    >
      {link && <p className="broken_link_dialog-text">{link.text}</p>}
      <div className="ui-modal-actions broken_link_dialog-actions">
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="secondary" onClick={onRemove}>Remove link</Button>
        <Button type="button" variant="primary" onClick={onPickTarget}>Pick a new target</Button>
      </div>
    </Modal>
  )
}
