import { useState } from 'react'
import { Download, Eye, File, FileArchive, FileAudio, FileImage, FileSpreadsheet, FileText, FileVideo, X, type LucideIcon } from 'lucide-react'
import {
  attachmentKind,
  downloadUrl,
  fileIconKind,
  fileTypeLabel,
  formatBytes,
  previewKind,
  safeAttachmentUrl,
  type FileIconKind,
} from '@/data/attachment'
import { Button, ButtonLink } from './Button'
import { Modal } from './Modal'
import { classNames } from './classNames'
import './AttachmentCard.scss'

const ICONS: Record<FileIconKind, LucideIcon> = {
  audio: FileAudio,
  video: FileVideo,
  image: FileImage,
  archive: FileArchive,
  spreadsheet: FileSpreadsheet,
  document: FileText,
  file: File,
}

type AttachmentCardProps = {
  name: string
  url: string | null | undefined
  type?: string | null
  size?: number | null
  // Plays the file in the card (audio files); other files show Preview and Download.
  player?: boolean
  selected?: boolean
  // Shows a Remove button; leave unset when the viewer can't edit.
  onRemove?: () => void
  // What the button is called when it does something other than remove (a task's file is detached).
  removeLabel?: string
}

// A file in a document or on a task: icon, name, type and size, a player for
// audio, Preview for what the browser can show (images, PDFs) and Download.
export function AttachmentCard({ name, url, type, size, player, selected, onRemove, removeLabel = 'Remove' }: AttachmentCardProps) {
  const [previewing, setPreviewing] = useState(false)
  const safeUrl = safeAttachmentUrl(url)
  const Icon = ICONS[fileIconKind(type, name)]
  const preview = safeUrl ? previewKind(type, name) : null
  const meta = [fileTypeLabel(type, name), typeof size === 'number' ? formatBytes(size) : '', !safeUrl && 'Unavailable']
    .filter(Boolean)
    .join(' · ')
  const playable = player && safeUrl && attachmentKind(type, name) === 'audio'

  return (
    <div role="group" aria-label={`Attachment: ${name}`} className={classNames('ui-attachment', selected && 'ui-attachment--selected')}>
      <div className="ui-attachment-main">
        <Icon className="ui-attachment-icon" aria-hidden="true" />
        <div className="ui-attachment-text">
          <span className="ui-attachment-name" title={name}>{name}</span>
          <span className="ui-attachment-meta">{meta}</span>
        </div>
        <div className="ui-attachment-actions">
          {preview && (
            <Button type="button" variant="secondary" className="ui-attachment-action" onClick={() => setPreviewing(true)}>
              <Eye className="ui-attachment-action_icon" aria-hidden="true" />
              Preview
            </Button>
          )}
          {safeUrl && (
            <ButtonLink variant="secondary" className="ui-attachment-action" href={downloadUrl(safeUrl)} download={name} aria-label={`Download ${name}`}>
              <Download className="ui-attachment-action_icon" aria-hidden="true" />
              Download
            </ButtonLink>
          )}
          {onRemove && (
            <Button type="button" variant="ghost" className="ui-attachment-action ui-attachment-action--icon" aria-label={`${removeLabel} ${name}`} title={removeLabel} onClick={onRemove}>
              <X className="ui-attachment-action_icon" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {playable && <audio className="ui-attachment-player" controls preload="metadata" src={safeUrl} aria-label={`Play ${name}`} />}
      {preview && safeUrl && (
        <Modal open={previewing} title={name} wide onClose={() => setPreviewing(false)}>
          {preview === 'image'
            ? <img className="ui-attachment-preview" src={safeUrl} alt={name} />
            : <iframe className="ui-attachment-preview ui-attachment-preview--pdf" src={safeUrl} title={`Preview of ${name}`} referrerPolicy="no-referrer" />}
          <div className="ui-modal-actions">
            <ButtonLink variant="secondary" href={safeUrl} target="_blank" rel="noopener noreferrer">Open in a new tab</ButtonLink>
            <Button type="button" variant="primary" onClick={() => setPreviewing(false)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
