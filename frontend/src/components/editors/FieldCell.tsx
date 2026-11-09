import { useState, type ReactNode } from 'react'
import { DatePicker, Input, Select, Textarea } from '@/components/ui'
import { RatingInput } from '@/components/task-fields/TaskFieldInput'
import type { CellValue, TableData, TableField } from '@/api/tables'
import { displayValue, formatKey, formatValue, isReadOnly, readTyped } from '@/data/fieldType'
import type { Document } from '@/types'
import ChoiceList from './ChoiceList'
import FileCell from './FileCell'
import './FieldCell.scss'

export const INPUT_CLASS = 'table_editor-input'

// A Space member a person field can name.
export interface Person { id: number; name: string }

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

// Text typed into a typed field is read into the plain value that is stored
// (money "$1,250.00" becomes 1250), and shown in the field's format again once
// the cell loses focus. While it has focus the cell shows what is being typed.
function TypedInput({ field, value, invalid, inputType = 'text', inputMode, onChange }: {
  field: TableField
  value: CellValue | undefined
  invalid: boolean
  inputType?: 'text' | 'email' | 'url' | 'tel'
  inputMode?: 'decimal' | 'numeric'
  onChange: (value: CellValue) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  return (
    <Input
      aria-label={field.name}
      aria-invalid={invalid || undefined}
      className={INPUT_CLASS}
      type={inputType}
      inputMode={inputMode}
      autoComplete="off"
      value={draft ?? displayValue(field, value)}
      onFocus={() => setDraft(value == null ? '' : String(value))}
      onChange={(e) => {
        setDraft(e.target.value)
        onChange(e.target.value.trim() === '' ? null : (readTyped(field.data_type, e.target.value) as CellValue))
      }}
      onBlur={() => setDraft(null)}
    />
  )
}

// A value the app fills in (an auto-number, a created or updated time): shown, never typed.
function ReadOnlyCell({ field, value }: { field: TableField; value: CellValue | undefined }) {
  const text = displayValue(field, value)
  return <output aria-label={field.name} className="table_editor-read_only">{text || <span className="field_cell-placeholder">Automatic</span>}</output>
}

// One cell of a record in the grid: the control for the field's type, editing
// the plain value that is stored. Formula fields are worked out by the grid and never reach here.
export default function FieldCell({ field, value, invalid = false, relations, files, people, onChange }: {
  field: TableField
  value: CellValue | undefined
  invalid?: boolean
  relations: Map<number, TableData>
  files: Document[]
  people: Person[]
  onChange: (value: CellValue) => void
}) {
  const type = field.data_type
  const label = field.name
  const format = formatKey(type, field.display_format)
  const options = field.options ?? []
  const text = value == null ? '' : String(value)
  const select = (selected: string, change: (raw: string) => CellValue, choices: ReactNode, empty: string) => (
    <Select aria-label={label} className={INPUT_CLASS} value={selected} onChange={(e) => onChange(change(e.target.value))}>
      <option value="">{empty}</option>
      {choices}
    </Select>
  )
  const toNumber = (raw: string) => (raw ? Number(raw) : null)

  if (isReadOnly(type)) return <ReadOnlyCell field={field} value={value} />
  switch (type) {
    case 'boolean':
      return select(value == null ? '' : String(value), (raw) => (raw === '' ? null : raw === 'true'), <><option value="true">True</option><option value="false">False</option></>, 'Empty')
    case 'file':
    case 'files':
      return <FileCell label={label} many={type === 'files'} value={value as number | number[] | null | undefined} files={files} onChange={onChange} />
    case 'relation': {
      const target = field.relation_table_id ? relations.get(field.relation_table_id) : undefined
      const labelField = target?.fields.find((f) => f.data_type === 'text')
      return select(text, toNumber, target?.records.map((row) => {
        const name = labelField ? row.values[labelField.id] : null
        return <option key={row.id} value={row.id}>#{row.id}{name ? ` · ${name}` : ''}</option>
      }), target ? 'No linked record' : 'Loading records…')
    }
    case 'single_select':
      return select(text, (raw) => raw || null, options.map((choice) => <option key={choice} value={choice}>{choice}</option>), 'Empty')
    case 'person': {
      const known = people.some((person) => person.id === value)
      return select(text, toNumber, <>
        {people.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        {value != null && !known && <option value={String(value)}>{displayValue(field, value)}</option>}
      </>, 'No one')
    }
    case 'month':
      return select(text, toNumber, MONTHS.map((month) => <option key={month} value={month}>{formatValue('month', format, month)}</option>), 'Empty')
    case 'rating':
      return format === 'number'
        ? select(text, toNumber, [1, 2, 3, 4, 5].map((stars) => <option key={stars} value={stars}>{formatValue('rating', 'number', stars)}</option>), 'Empty')
        : <RatingInput label={label} rating={typeof value === 'number' ? value : 0} onChange={onChange} />
    case 'multi_select': {
      const chosen = Array.isArray(value) ? (value as string[]) : []
      return <ChoiceList label={label} summary={chosen.length ? chosen.join(', ') : 'Choose'} options={options.map((choice) => ({ value: choice, label: choice }))}
        selected={chosen} empty="This field has no choices yet." onChange={(next) => onChange(next.length ? next : null)} />
    }
    case 'date':
      return <DatePicker aria-label={label} className={INPUT_CLASS} value={text} onChange={(e) => onChange(e.target.value || null)} />
    case 'datetime':
      return <Input aria-label={label} className={INPUT_CLASS} type="datetime-local" value={value == null ? '' : new Date(String(value)).toISOString().slice(0, 16)}
        onChange={(e) => onChange(e.target.value ? `${e.target.value}:00Z` : null)} />
    case 'long_text':
      return <Textarea aria-label={label} className={INPUT_CLASS} rows={2} value={text} onChange={(e) => onChange(e.target.value || null)} />
    case 'integer':
    case 'number':
    case 'year':
      if ((type === 'integer' || type === 'number') && format === 'commas') return <TypedInput field={field} value={value} invalid={invalid} inputMode="decimal" onChange={onChange} />
      return <Input aria-label={label} aria-invalid={invalid || undefined} className={INPUT_CLASS} type="number" step={type === 'number' ? 'any' : '1'}
        min={type === 'year' ? 1000 : undefined} max={type === 'year' ? 9999 : undefined} value={text} onChange={(e) => onChange(toNumber(e.target.value))} />
    case 'money':
    case 'mileage':
    case 'percent':
      return <TypedInput field={field} value={value} invalid={invalid} inputMode="decimal" onChange={onChange} />
    case 'phone':
      return <TypedInput field={field} value={value} invalid={invalid} inputType="tel" onChange={onChange} />
    case 'email':
      return <TypedInput field={field} value={value} invalid={invalid} inputType="email" onChange={onChange} />
    case 'url':
      return <TypedInput field={field} value={value} invalid={invalid} inputType="url" onChange={onChange} />
    case 'color':
      return (
        <div className="field_cell-color">
          <span className="field_cell-swatch" aria-hidden="true" style={{ backgroundColor: typeof value === 'string' && /^#[0-9a-f]{6}$/.test(value) ? value : undefined }} />
          <TypedInput field={field} value={value} invalid={invalid} onChange={onChange} />
        </div>
      )
    case 'username':
    case 'person_name':
    case 'alphanumeric':
      return <TypedInput field={field} value={value} invalid={invalid} onChange={onChange} />
    default:
      return <Input aria-label={label} className={INPUT_CLASS} value={text} onChange={(e) => onChange(e.target.value || null)} />
  }
}
