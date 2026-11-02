import { useState, type FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { Button, Input, Modal, StatusDot, classNames } from '@/components/ui'
import { useResetTaskStatusSettings, useSaveTaskStatusSettings } from '@/api/taskStatusSettings'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import {
  COLOR_LABEL,
  DEFAULT_STATUS_LABEL,
  STATUS_LABEL_MAX_LENGTH,
  TASK_STATUSES,
  TASK_STATUS_COLORS,
  editedFolderId,
  hasOwnSettings,
  inheritedStatuses,
  overridesFromStyles,
  type BoardStatuses,
} from '@/data/task_status'
import type { TaskStatus } from '@/types'
import './StatusSettings.scss'

function StatusSettingsForm({ folderId, onClose }: { folderId: number | null; onClose: () => void }) {
  const { statuses, scope, settings } = useBoardStatuses(folderId)
  const save = useSaveTaskStatusSettings()
  const reset = useResetTaskStatusSettings()
  const [draft, setDraft] = useState<BoardStatuses>(statuses)
  const inherited = inheritedStatuses(settings, scope)
  const forSpace = scope.length === 0
  const busy = save.isPending || reset.isPending

  function change(status: TaskStatus, patch: Partial<BoardStatuses[TaskStatus]>) {
    setDraft((current) => ({ ...current, [status]: { ...current[status], ...patch } }))
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    save.mutate({ folderId: editedFolderId(scope), statuses: overridesFromStyles(draft, inherited) }, { onSuccess: onClose })
  }

  return (
    <form onSubmit={submit} className="ui-modal-form">
      <p className="status_settings-hint">
        {forSpace
          ? 'Every board in this Space shows these unless its folder sets its own.'
          : 'Applies to this folder and the folders inside it. Anything left as it is follows the Space.'}
      </p>
      <ul className="status_settings-list">
        {TASK_STATUSES.map((status) => (
          <li key={status} className="status_settings-row">
            <div className="status_settings-name">
              <StatusDot color={draft[status].color} />
              <Input
                aria-label={`Name for ${DEFAULT_STATUS_LABEL[status]}`}
                value={draft[status].label}
                maxLength={STATUS_LABEL_MAX_LENGTH}
                placeholder={inherited[status].label}
                onChange={(e) => change(status, { label: e.target.value })}
              />
            </div>
            <div role="group" aria-label={`Color for ${DEFAULT_STATUS_LABEL[status]}`} className="status_settings-colors">
              {TASK_STATUS_COLORS.map((color) => (
                <Button
                  key={color}
                  type="button"
                  aria-label={COLOR_LABEL[color]}
                  aria-pressed={draft[status].color === color}
                  title={COLOR_LABEL[color]}
                  className={classNames('status_settings-swatch', draft[status].color === color && 'status_settings-swatch--selected')}
                  onClick={() => change(status, { color })}
                >
                  <StatusDot color={color} />
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="ui-modal-actions">
        {hasOwnSettings(settings, scope) && (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            title={forSpace ? 'Go back to the built-in names and colors' : 'Follow the Space again'}
            onClick={() => reset.mutate(editedFolderId(scope), { onSuccess: onClose })}
          >
            Reset
          </Button>
        )}
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>Save</Button>
      </div>
    </form>
  )
}

// Rename and recolor the task statuses of one board: a folder's, or with no
// folder the Space default. Tasks keep the status they have; only how the
// board shows it changes.
export function StatusSettings({ open, folderId, boardName, onClose }: {
  open: boolean
  folderId: number | null
  boardName: string
  onClose: () => void
}) {
  const { ready } = useBoardStatuses(folderId)
  return (
    <Modal
      open={open}
      title={`Statuses for ${boardName}`}
      description="Rename and recolor how tasks are shown. A task keeps its place; only the name and color change."
      onClose={onClose}
    >
      {ready ? <StatusSettingsForm folderId={folderId} onClose={onClose} /> : <Loader2 className="status_settings-loading" aria-label="Loading" />}
    </Modal>
  )
}
