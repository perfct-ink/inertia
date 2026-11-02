import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input, Modal, Select, Textarea } from '@/components/ui'
import { useCreateTaskField, useDeleteTaskField, useUpdateTaskField } from '@/api/taskFields'
import { TASK_FIELD_TYPES, MAX_NAME_LENGTH, MAX_OPTIONS, parseOptions, typeLabel, validateFieldDraft } from '@/data/taskField'
import type { TaskField, TaskFieldType } from '@/types'
import './TaskFields.scss'

const OPTIONS_PLACEHOLDER = 'One choice per line'

// Define the Space's custom task fields: add one, rename it, change a
// dropdown's choices, or delete it (which deletes its values on every task).
export function ManageTaskFieldsDialog({ open, fields, onClose }: { open: boolean; fields: TaskField[]; onClose: () => void }) {
  return (
    <Modal
      open={open}
      title="Task fields"
      description="Every task in this Space can carry these fields."
      onClose={onClose}
      className="task_fields-modal"
    >
      {fields.length > 0 && (
        <ul className="task_fields-manage_list">
          {fields.map((field) => (
            <FieldRow key={field.id} field={field} otherNames={fields.filter((f) => f.id !== field.id).map((f) => f.name)} />
          ))}
        </ul>
      )}
      <NewFieldForm existingNames={fields.map((f) => f.name)} />
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

function FieldRow({ field, otherNames }: { field: TaskField; otherNames: string[] }) {
  const update = useUpdateTaskField()
  const remove = useDeleteTaskField()
  const [name, setName] = useState(field.name)
  const [optionsText, setOptionsText] = useState(field.options.join('\n'))
  const [problem, setProblem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const isDropdown = field.field_type === 'dropdown'
  const options = parseOptions(optionsText)
  const removed = isDropdown ? field.options.filter((option) => !options.includes(option)) : []
  const dirty = name.trim() !== field.name || (isDropdown && options.join('\n') !== field.options.join('\n'))

  function save(e: FormEvent) {
    e.preventDefault()
    const error = validateFieldDraft({ name, field_type: field.field_type, options }, otherNames)
    setProblem(error)
    if (error) return
    update.mutate(
      { id: field.id, name: name.trim(), ...(isDropdown ? { options } : {}) },
      { onSuccess: (saved) => { setName(saved.name); setOptionsText(saved.options.join('\n')) } },
    )
  }

  return (
    <li className="task_fields-manage_row">
      <form onSubmit={save} className="task_fields-manage_form">
        <div className="task_fields-manage_top">
          <Input aria-label={`Name of ${field.name}`} maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="task_fields-manage_type">{typeLabel(field.field_type)}</span>
          <Button type="button" variant="ghost" className="task_fields-touch" aria-label={`Delete ${field.name}`} title="Delete field" onClick={() => setConfirming(true)}>
            <Trash2 className="task_fields-icon" aria-hidden="true" />
          </Button>
        </div>
        {isDropdown && (
          <Textarea
            aria-label={`Choices for ${field.name}`}
            placeholder={OPTIONS_PLACEHOLDER}
            rows={Math.min(Math.max(options.length, 2), 6)}
            value={optionsText}
            onChange={(e) => setOptionsText(e.target.value)}
          />
        )}
        {removed.length > 0 && (
          <p className="task_fields-hint">Tasks that use {removed.map((option) => `"${option}"`).join(', ')} will lose that value.</p>
        )}
        <FormError message={problem} />
        {dirty && (
          <div className="task_fields-manage_actions">
            <Button type="submit" variant="primary" disabled={update.isPending}>Save</Button>
          </div>
        )}
      </form>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${field.name}?`}
        description="Its values on every task are deleted too."
        confirmLabel="Delete field"
        destructive
        onConfirm={() => remove.mutate(field.id)}
        onClose={() => setConfirming(false)}
      />
    </li>
  )
}

function NewFieldForm({ existingNames }: { existingNames: string[] }) {
  const create = useCreateTaskField()
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<TaskFieldType>('tags')
  const [optionsText, setOptionsText] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const hint = TASK_FIELD_TYPES.find((t) => t.type === fieldType)?.hint

  function submit(e: FormEvent) {
    e.preventDefault()
    const options = fieldType === 'dropdown' ? parseOptions(optionsText) : []
    const error = validateFieldDraft({ name, field_type: fieldType, options }, existingNames)
    setProblem(error)
    if (error) return
    create.mutate(
      { name: name.trim(), field_type: fieldType, options },
      { onSuccess: () => { setName(''); setOptionsText('') } },
    )
  }

  return (
    <form onSubmit={submit} className="task_fields-new">
      <h3 className="task_fields-new_title">Add a field</h3>
      <div className="task_fields-new_row">
        <Input aria-label="Field name" placeholder="Field name, e.g. Priority" maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
        <Select aria-label="Field kind" value={fieldType} onChange={(e) => setFieldType(e.target.value as TaskFieldType)}>
          {TASK_FIELD_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
        </Select>
      </div>
      {hint && <p className="task_fields-hint">{hint}</p>}
      {fieldType === 'dropdown' && (
        <Textarea
          aria-label="Dropdown choices"
          placeholder={OPTIONS_PLACEHOLDER}
          rows={3}
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
      )}
      {fieldType === 'dropdown' && <p className="task_fields-hint">Up to {MAX_OPTIONS} choices. Separate them with new lines or commas.</p>}
      <FormError message={problem} />
      <div className="task_fields-manage_actions">
        <Button type="submit" variant="primary" disabled={create.isPending}>Add field</Button>
      </div>
    </form>
  )
}
