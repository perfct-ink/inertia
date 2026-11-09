import { Loader2 } from 'lucide-react'
import { classNames } from './classNames'
import './SaveStatus.scss'

export type SaveState = 'saved' | 'saving' | 'unsaved'

const SAVE_STATE_LABEL: Record<SaveState, string> = {
  saved: 'All changes saved',
  saving: 'Saving…',
  unsaved: 'Unsaved changes',
}

// Whether the document or sheet in front of you is safe: nothing drawn while it
// is saved, a spinner while it saves, a dot while changes wait to be saved.
// The words are read out to screen readers as a polite status.
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  return (
    <div role="status" className={classNames('ui-save_status', className)}>
      {state === 'saving' && <Loader2 aria-hidden="true" className="ui-save_status-spinner" />}
      {state === 'unsaved' && <span aria-hidden="true" className="ui-save_status-dot" />}
      <span className="ui-save_status-text">{SAVE_STATE_LABEL[state]}</span>
    </div>
  )
}
