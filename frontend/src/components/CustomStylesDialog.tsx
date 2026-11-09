import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, Modal } from '@/components/ui'
import { useDeleteParagraphStyle } from '@/api/paragraphStyles'
import { STYLE_BASE_LABELS, type CustomParagraphStyle } from '@/data/customParagraphStyle'
import './CustomStylesDialog.scss'

interface Props {
  open: boolean
  // The person's own custom styles.
  styles: CustomParagraphStyle[]
  // Opens the style in the form to change it.
  onEdit: (style: CustomParagraphStyle) => void
  onClose: () => void
}

// The person's custom paragraph styles, to edit or delete. A failed delete shows
// the usual error notice. Documents keep a copy of the style they use, so deleting
// one changes no document by itself: the editor turns its paragraphs into Body in
// the documents the person opens (hooks/useCustomStyleSync.ts).
export default function CustomStylesDialog({ open, styles, onEdit, onClose }: Props) {
  const remove = useDeleteParagraphStyle()
  const [deleting, setDeleting] = useState<CustomParagraphStyle | null>(null)

  return (
    <>
      <Modal
        open={open}
        title="My paragraph styles"
        description="Saved to your account, for every document you edit."
        onClose={onClose}
        className="custom_styles_dialog"
      >
        {styles.length === 0 ? (
          <p className="custom_styles_dialog-empty">You have no styles of your own.</p>
        ) : (
          <ul className="custom_styles_dialog-list">
            {styles.map((style) => (
              <li key={style.id} className="custom_styles_dialog-row">
                <span className="custom_styles_dialog-name">
                  {style.name}
                  <span className="custom_styles_dialog-base">Based on {STYLE_BASE_LABELS[style.base] ?? STYLE_BASE_LABELS.body}</span>
                </span>
                <Button type="button" variant="ghost" className="custom_styles_dialog-touch" aria-label={`Edit ${style.name}`} title="Edit style" onClick={() => onEdit(style)}>
                  <Pencil className="custom_styles_dialog-icon" aria-hidden="true" />
                </Button>
                <Button type="button" variant="ghost" className="custom_styles_dialog-touch" aria-label={`Delete ${style.name}`} title="Delete style" onClick={() => setDeleting(style)}>
                  <Trash2 className="custom_styles_dialog-icon" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={deleting !== null}
        title={`Delete ${deleting?.name ?? 'this style'}?`}
        description="Paragraphs in this style turn into Body in the documents you edit. People you share a document with keep seeing the style until you next open it."
        confirmLabel="Delete style"
        destructive
        onConfirm={() => { if (deleting) remove.mutate(deleting.id) }}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
