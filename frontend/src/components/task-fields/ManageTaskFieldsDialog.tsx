import { useState, type FormEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input, Modal, Select, Textarea } from '@/components/ui'
import { useCreateTaskField, useDeleteTaskField, useUpdateTaskField } from '@/api/taskFields'
import { taskFieldTypes, MAX_NAME_LENGTH, MAX_OPTIONS, hasTaskChoices, isCollectionType, parseOptions, typeLabel, validateFieldDraft } from '@/data/taskField'
import { defaultFormat, formatChoiceLabel, formatsOf, hasFormatChoice } from '@/data/fieldType'
import { FORMULA_HELP, MAX_FORMULA_LENGTH } from '@/data/formula'
import type { FieldDataType } from '@/api/tables'
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
            <FieldRow key={field.id} field={field} others={fields.filter((f) => f.id !== field.id)} />
          ))}
        </ul>
      )}
      <NewFieldForm existing={fields} />
      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}

function FieldRow({ field, others }: { field: TaskField; others: TaskField[] }) {
  const update = useUpdateTaskField()
  const remove = useDeleteTaskField()
  const type = field.field_type
  const [name, setName] = useState(field.name)
  const [optionsText, setOptionsText] = useState(field.options.join('\n'))
  const [format, setFormat] = useState(field.display_format ?? (isCollectionType(type) ? defaultFormat(type as FieldDataType) : null) ?? '')
  const [formula, setFormula] = useState(field.formula ?? '')
  const [problem, setProblem] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const isDropdown = hasTaskChoices(type)
  const isFormula = type === 'formula'
  const formatChoice = isCollectionType(type) && hasFormatChoice(type as FieldDataType)
  const savedFormat = field.display_format ?? (isCollectionType(type) ? defaultFormat(type as FieldDataType) : null) ?? ''
  const options = parseOptions(optionsText)
  const removed = isDropdown ? field.options.filter((option) => !options.includes(option)) : []
  const dirty = name.trim() !== field.name || (isDropdown && options.join('\n') !== field.options.join('\n'))
    || (formatChoice && format !== savedFormat) || (isFormula && formula.trim() !== (field.formula ?? ''))

  function save(e: FormEvent) {
    e.preventDefault()
    const error = validateFieldDraft({ name, field_type: type, options, formula }, others.map((f) => f.name), others)
    setProblem(error)
    if (error) return
    update.mutate(
      {
        id: field.id, name: name.trim(),
        ...(isDropdown ? { options } : {}),
        ...(formatChoice ? { display_format: format } : {}),
        ...(isFormula ? { formula: formula.trim() } : {}),
      },
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
        {formatChoice && <FormatPicker type={type} label={`Format of ${field.name}`} value={format} onChange={setFormat} />}
        {isFormula && <FormulaInput label={`Formula of ${field.name}`} value={formula} onChange={setFormula} />}
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

function NewFieldForm({ existing }: { existing: TaskField[] }) {
  const create = useCreateTaskField()
  const [name, setName] = useState('')
  const [fieldType, setFieldType] = useState<TaskFieldType>('tags')
  const [optionsText, setOptionsText] = useState('')
  const [format, setFormat] = useState('')
  const [formula, setFormula] = useState('')
  const [problem, setProblem] = useState<string | null>(null)
  const hint = taskFieldTypes().find((t) => t.type === fieldType)?.hint
  const choices = hasTaskChoices(fieldType)
  const formatChoice = isCollectionType(fieldType) && hasFormatChoice(fieldType as FieldDataType)

  function chooseType(type: TaskFieldType) {
    setFieldType(type)
    setFormat(isCollectionType(type) ? defaultFormat(type as FieldDataType) ?? '' : '')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const options = choices ? parseOptions(optionsText) : []
    const error = validateFieldDraft({ name, field_type: fieldType, options, formula }, existing.map((f) => f.name), existing)
    setProblem(error)
    if (error) return
    create.mutate(
      {
        name: name.trim(), field_type: fieldType, options,
        ...(formatChoice ? { display_format: format } : {}),
        ...(fieldType === 'formula' ? { formula: formula.trim() } : {}),
      },
      { onSuccess: () => { setName(''); setOptionsText(''); setFormula('') } },
    )
  }

  return (
    <form onSubmit={submit} className="task_fields-new">
      <h3 className="task_fields-new_title">Add a field</h3>
      <div className="task_fields-new_row">
        <Input aria-label="Field name" placeholder="Field name, e.g. Priority" maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
        <Select aria-label="Field kind" value={fieldType} onChange={(e) => chooseType(e.target.value as TaskFieldType)}>
          <optgroup label="Task fields">
            {taskFieldTypes().filter((t) => t.group === 'task').map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </optgroup>
          <optgroup label="Collection field types">
            {taskFieldTypes().filter((t) => t.group === 'collection').map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
          </optgroup>
        </Select>
      </div>
      {hint && <p className="task_fields-hint">{hint}</p>}
      {choices && (
        <Textarea
          aria-label="Dropdown choices"
          placeholder={OPTIONS_PLACEHOLDER}
          rows={3}
          value={optionsText}
          onChange={(e) => setOptionsText(e.target.value)}
        />
      )}
      {choices && <p className="task_fields-hint">Up to {MAX_OPTIONS} choices. Separate them with new lines or commas.</p>}
      {formatChoice && <FormatPicker type={fieldType} label="Format" value={format} onChange={setFormat} />}
      {fieldType === 'formula' && <FormulaInput label="Formula" value={formula} onChange={setFormula} />}
      <FormError message={problem} />
      <div className="task_fields-manage_actions">
        <Button type="submit" variant="primary" disabled={create.isPending}>Add field</Button>
      </div>
    </form>
  )
}

// How a Collection type's values are shown, for a type with more than one way.
function FormatPicker({ type, label, value, onChange }: { type: TaskFieldType; label: string; value: string; onChange: (format: string) => void }) {
  return (
    <Select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {formatsOf(type as FieldDataType).map((option) => <option key={option.key} value={option.key}>{formatChoiceLabel(option)}</option>)}
    </Select>
  )
}

// A formula, in the Collection formula language; it can name the task's Title,
// Status, Due date, Start date and Assignee as well as the other fields.
function FormulaInput({ label, value, onChange }: { label: string; value: string; onChange: (formula: string) => void }) {
  return (
    <>
      <Input aria-label={label} placeholder="e.g. DAYS({Due date}, TODAY())" maxLength={MAX_FORMULA_LENGTH} value={value} onChange={(e) => onChange(e.target.value)} />
      <p className="task_fields-hint">{FORMULA_HELP} A task&apos;s Title, Status, Due date, Start date and Assignee can be named too.</p>
    </>
  )
}
