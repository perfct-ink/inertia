import { useState, type FormEvent } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input, Modal, PromptDialog, Select } from '@/components/ui'
import { useCreateTaskField, useDeleteTaskField, useTaskFields, useUpdateTaskField } from '@/api/taskFields'
import { isDuplicateFieldName, MAX_TASK_FIELDS, TASK_FIELD_TYPE_LIST, TASK_FIELD_TYPES } from '@/data/taskField'
import { errorMessage } from '@/util/errorMessage'
import type { TaskField, TaskFieldType } from '@/types'
import './TaskFieldsManager.scss'

// Define the custom fields every task in the Space can have: add (name and
// type), rename and delete. Deleting a field deletes its values from all tasks,
// so it asks first. Only shown to people who may change fields (admins and
// owners); the server enforces that too.
export function TaskFieldsManager({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: fields = [] } = useTaskFields()
  const create = useCreateTaskField()
  const rename = useUpdateTaskField()
  const remove = useDeleteTaskField()
  const [name, setName] = useState('')
  const [type, setType] = useState<TaskFieldType>('text')
  const [error, setError] = useState<string | null>(null)
  const [renaming, setRenaming] = useState<TaskField | null>(null)
  const [deleting, setDeleting] = useState<TaskField | null>(null)
  const duplicate = isDuplicateFieldName(name, fields)
  const full = fields.length >= MAX_TASK_FIELDS

  function close() {
    setName('')
    setError(null)
    onClose()
  }

  function add(e: FormEvent) {
    e.preventDefault()
    if (!name.trim() || duplicate || full) return
    setError(null)
    create.mutate({ name: name.trim(), data_type: type }, {
      onSuccess: () => setName(''),
      onError: (err) => setError(errorMessage(err)),
    })
  }

  function renameField(field: TaskField, newName: string) {
    if (!newName || newName === field.name) return
    setError(null)
    rename.mutate({ id: field.id, name: newName }, { onError: (err) => setError(errorMessage(err)) })
  }

  function deleteField(field: TaskField) {
    setError(null)
    remove.mutate(field.id, { onError: (err) => setError(errorMessage(err)) })
  }

  return (
    <Modal open={open} title="Custom fields" description="Extra fields every task in this Space can have." onClose={close}>
      {fields.length === 0 ? (
        <p className="task_fields_manager-empty">No custom fields yet. Add one below.</p>
      ) : (
        <ul className="task_fields_manager-list">
          {fields.map((field) => (
            <li key={field.id} className="task_fields_manager-row">
              <div className="task_fields_manager-field">
                <p className="task_fields_manager-name">{field.name}</p>
                <p className="task_fields_manager-type">{TASK_FIELD_TYPES[field.data_type].label}</p>
              </div>
              <Button variant="ghost" aria-label={`Rename ${field.name}`} title="Rename" onClick={() => setRenaming(field)}>
                <Pencil className="task_fields_manager-icon" />
              </Button>
              <Button variant="ghost" aria-label={`Delete ${field.name}`} title="Delete" onClick={() => setDeleting(field)}>
                <Trash2 className="task_fields_manager-icon" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="task_fields_manager-add">
        <Input
          aria-label="Field name"
          placeholder="Field name, e.g. Story points"
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="task_fields_manager-add_row">
          <Select aria-label="Field type" value={type} onChange={(e) => setType(e.target.value as TaskFieldType)}>
            {TASK_FIELD_TYPE_LIST.map((t) => <option key={t} value={t}>{TASK_FIELD_TYPES[t].label}</option>)}
          </Select>
          <Button type="submit" variant="primary" disabled={!name.trim() || duplicate || full || create.isPending}>Add field</Button>
        </div>
      </form>
      <FormError message={error ?? (duplicate ? `A field called “${name.trim()}” already exists.` : full ? `A Space can have at most ${MAX_TASK_FIELDS} custom fields.` : null)} />

      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={close}>Close</Button>
      </div>

      <PromptDialog
        open={renaming !== null}
        title="Rename field"
        label="Field name"
        initialValue={renaming?.name}
        onSubmit={(newName) => renaming && renameField(renaming, newName)}
        onClose={() => setRenaming(null)}
      />
      <ConfirmDialog
        open={deleting !== null}
        title="Delete field"
        description={deleting ? `Delete “${deleting.name}” and its values on every task? This cannot be undone.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && deleteField(deleting)}
        onClose={() => setDeleting(null)}
      />
    </Modal>
  )
}
