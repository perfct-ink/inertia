import { Input, Select } from '@/components/ui'
import { TASK_FIELD_TYPES, type FieldDraft } from '@/data/taskField'
import type { TaskField } from '@/types'
import './TaskFieldInputs.scss'

// One labelled control per custom field, typed by the field (date picker for a
// date, a yes/no choice for a boolean, ...). Controlled: the parent keeps the
// draft (see data/taskField.ts) and decides when to save it.
export function TaskFieldInputs({ fields, draft, onChange }: {
  fields: TaskField[]
  draft: FieldDraft
  onChange: (fieldId: string, raw: string) => void
}) {
  return (
    <div className="task_field_inputs">
      {fields.map((field) => {
        const id = String(field.id)
        const { input, step } = TASK_FIELD_TYPES[field.data_type]
        return (
          <label key={id} className="task_field_inputs-field">
            <span className="task_field_inputs-name">{field.name}{field.data_type === 'datetime' ? ' (UTC)' : ''}</span>
            {input === 'select' ? (
              <Select value={draft[id] ?? ''} onChange={(e) => onChange(id, e.target.value)}>
                <option value="">Not set</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </Select>
            ) : (
              <Input type={input} step={step} value={draft[id] ?? ''} onChange={(e) => onChange(id, e.target.value)} />
            )}
          </label>
        )
      })}
    </div>
  )
}
