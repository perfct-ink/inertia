import type { DataType, TableData, TableField } from '@/api/tables'
import { neutralizeFormula, type CsvCell } from '@/util/csv'

// Moving a collection's records to and from CSV. The server checks every value
// again and applies the same limits (backend TableCsvImport).
export const MAX_IMPORT_ROWS = 1000
export const MAX_IMPORT_CELLS = 10000
export const RECORD_ID_HEADER = 'Record ID'
const MAX_REPORTED_ISSUES = 100

// Types a new field made from a column can have (relations need another
// collection, so they are never guessed or offered).
export const NEW_FIELD_TYPES: DataType[] = ['text', 'integer', 'number', 'boolean', 'date', 'datetime']
export const NEW_FIELD_TYPE_LABELS: Partial<Record<DataType, string>> = {
  text: 'Text', integer: 'Integer', number: 'Number', boolean: 'Boolean', date: 'Date', datetime: 'Date and time',
}

// What happens to one CSV column on import.
export type ColumnTarget =
  | { kind: 'skip' }
  | { kind: 'field'; fieldId: number }
  | { kind: 'new'; name: string; dataType: DataType }

// A column as the import endpoint takes it: an existing field, or a new one.
export type ImportColumn = { field_id: number } | { name: string; data_type: DataType }
export interface ImportPayload { columns: ImportColumn[]; rows: Array<Array<string | number | boolean>> }
export interface ImportIssue { row: number | null; message: string }
export interface ImportPlan { payload: ImportPayload | null; issues: ImportIssue[]; imported: number; skipped: number }

type Converted = { ok: true; value: string | number | boolean | null } | { ok: false; message: string }

// ── Export ────────────────────────────────────────────────────────────────────

// Header row plus one row per record. Relation cells hold the linked record's
// id, the same value an import reads back.
export function collectionToCsvRows(data: TableData): CsvCell[][] {
  const header: CsvCell[] = [RECORD_ID_HEADER, ...data.fields.map((field) => neutralizeFormula(field.name))]
  const records = data.records.map((record): CsvCell[] => [
    record.id,
    ...data.fields.map((field) => {
      const value = record.values[field.id]
      return typeof value === 'string' ? neutralizeFormula(value) : value
    }),
  ])
  return [header, ...records]
}

// ── Reading values ───────────────────────────────────────────────────────────

const INTEGER = /^-?(0|[1-9]\d*)$/
const DECIMAL = /^-?(0|[1-9]\d*)\.\d+$/
// Reading is looser than guessing: a column the user chose to read as a number
// may have a plus sign, leading zeros or a bare decimal point.
const LOOSE_INTEGER = /^[+-]?\d+$/
const LOOSE_NUMBER = /^[+-]?(\d+\.?\d*|\.\d+)$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_TIME = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(\.\d+)?)?\s*(Z|[+-]\d{2}:\d{2})?$/i

function isSafeInteger(text: string): boolean {
  return INTEGER.test(text) && Number.isSafeInteger(Number(text))
}

function validDate(text: string): boolean {
  const match = ISO_DATE.exec(text)
  if (!match) return false
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

// "2026-11-01 09:30" -> "2026-11-01T09:30:00Z". Times with no zone are UTC,
// like every datetime in a collection. Null when it is not a date and time.
export function normalizeDateTime(text: string): string | null {
  const match = DATE_TIME.exec(text.trim())
  if (!match) return null
  const [, date, hour, minute, second = '00', fraction = '', zone = 'Z'] = match
  if (!validDate(date) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return null
  return `${date}T${hour}:${minute}:${second}${fraction}${zone.toUpperCase()}`
}

const TRUE_WORDS = ['true', 'yes']
const FALSE_WORDS = ['false', 'no']

// Reads one CSV cell as the given type. Empty cells are null (no value).
export function convertCell(raw: string, dataType: DataType): Converted {
  const text = raw.trim()
  if (text === '') return { ok: true, value: null }
  switch (dataType) {
    case 'integer':
      return LOOSE_INTEGER.test(text) && Number.isSafeInteger(Number(text))
        ? { ok: true, value: Number(text) }
        : { ok: false, message: `“${text}” is not a whole number` }
    case 'number':
      return LOOSE_NUMBER.test(text) && Number.isFinite(Number(text))
        ? { ok: true, value: Number(text) }
        : { ok: false, message: `“${text}” is not a number` }
    case 'boolean': {
      const word = text.toLowerCase()
      if (TRUE_WORDS.includes(word)) return { ok: true, value: true }
      if (FALSE_WORDS.includes(word)) return { ok: true, value: false }
      return { ok: false, message: `“${text}” is not true or false` }
    }
    case 'date':
      return validDate(text) ? { ok: true, value: text } : { ok: false, message: `“${text}” is not a date written YYYY-MM-DD` }
    case 'datetime': {
      const normalized = normalizeDateTime(text)
      return normalized ? { ok: true, value: normalized } : { ok: false, message: `“${text}” is not a date and time like 2026-11-01 09:30` }
    }
    case 'relation':
      return /^#?\d+$/.test(text) ? { ok: true, value: Number(text.replace('#', '')) } : { ok: false, message: `“${text}” is not a record id` }
    default:
      return { ok: true, value: raw }
  }
}

// The narrowest type that reads every non-empty value; text when unsure. Zip
// codes and ids with leading zeros stay text.
export function guessFieldType(values: string[]): DataType {
  const present = values.map((value) => value.trim()).filter((value) => value !== '')
  if (present.length === 0) return 'text'
  if (present.every((value) => ['true', 'false'].includes(value.toLowerCase()))) return 'boolean'
  if (present.every(isSafeInteger)) return 'integer'
  if (present.every((value) => isSafeInteger(value) || (DECIMAL.test(value) && Number.isFinite(Number(value))))) return 'number'
  if (present.every(validDate)) return 'date'
  if (present.every((value) => normalizeDateTime(value) !== null)) return 'datetime'
  return 'text'
}

// ── Mapping columns to fields ────────────────────────────────────────────────

// A first guess for every column: the Record ID column is skipped, a header
// that names an existing field maps to it, anything else becomes a new field
// of the guessed type. A repeated header is skipped.
export function suggestTargets(rows: string[][], fields: TableField[]): ColumnTarget[] {
  const headers = rows[0] ?? []
  const records = rows.slice(1)
  const byName = new Map(fields.map((field) => [field.name.trim().toLowerCase(), field]))
  const usedFields = new Set<number>()
  const usedNames = new Set<string>()
  return headers.map((header, index): ColumnTarget => {
    const name = header.trim()
    const key = name.toLowerCase()
    if (key === RECORD_ID_HEADER.toLowerCase()) return { kind: 'skip' }
    const existing = byName.get(key)
    if (existing) {
      if (usedFields.has(existing.id)) return { kind: 'skip' }
      usedFields.add(existing.id)
      return { kind: 'field', fieldId: existing.id }
    }
    const newName = name || `Column ${index + 1}`
    if (usedNames.has(newName.toLowerCase())) return { kind: 'skip' }
    usedNames.add(newName.toLowerCase())
    return { kind: 'new', name: newName, dataType: guessFieldType(records.map((row) => row[index] ?? '')) }
  })
}

// ── Checking and shaping an import ───────────────────────────────────────────

// A column's target as the value of its <select>: "skip", "field:12" or "new:date".
export function targetValue(target: ColumnTarget): string {
  if (target.kind === 'skip') return 'skip'
  return target.kind === 'field' ? `field:${target.fieldId}` : `new:${target.dataType}`
}

// The target a <select> value stands for. Choosing a type for a column keeps
// the name already given to its new field (or the header, or "Column N").
export function targetFromValue(value: string, current: ColumnTarget, header: string, index: number): ColumnTarget {
  if (value.startsWith('field:')) return { kind: 'field', fieldId: Number(value.slice('field:'.length)) }
  if (!value.startsWith('new:')) return { kind: 'skip' }
  const name = current.kind === 'new' ? current.name : header.trim() || `Column ${index + 1}`
  return { kind: 'new', name, dataType: value.slice('new:'.length) as DataType }
}

// Turns the parsed file and the chosen targets into the request body, or the
// reasons it cannot be imported. Row numbers match a spreadsheet (the header is
// row 1). Rows with nothing in the imported columns are left out.
export function planImport(rows: string[][], targets: ColumnTarget[], fields: TableField[]): ImportPlan {
  const issues: ImportIssue[] = []
  const report = (row: number | null, message: string) => { if (issues.length < MAX_REPORTED_ISSUES) issues.push({ row, message }) }
  const records = rows.slice(1)
  const failed = (): ImportPlan => ({ payload: null, issues, imported: 0, skipped: 0 })

  if (records.length === 0) report(null, 'The file has no records below its header row.')
  if (records.length > MAX_IMPORT_ROWS) report(null, `A file can have at most ${MAX_IMPORT_ROWS} records; this one has ${records.length}. Split it and import the parts one at a time.`)

  const columns: Array<{ index: number; target: Exclude<ColumnTarget, { kind: 'skip' }>; type: DataType }> = []
  const fieldById = new Map(fields.map((field) => [field.id, field]))
  const seenFields = new Set<number>()
  const seenNames = new Set(fields.map((field) => field.name.trim().toLowerCase()))
  targets.forEach((target, index) => {
    if (target.kind === 'skip') return
    if (target.kind === 'field') {
      const field = fieldById.get(target.fieldId)
      if (!field) return report(null, `Column ${index + 1} points at a field that no longer exists.`)
      if (seenFields.has(field.id)) return report(null, `More than one column is set to import into “${field.name}”.`)
      seenFields.add(field.id)
      columns.push({ index, target, type: field.data_type })
    } else {
      const name = target.name.trim()
      if (!name) return report(null, `Column ${index + 1} needs a name for its new field.`)
      if (seenNames.has(name.toLowerCase())) return report(null, `A field named “${name}” already exists. Import that column into the existing field instead.`)
      seenNames.add(name.toLowerCase())
      columns.push({ index, target: { ...target, name }, type: target.dataType })
    }
  })
  if (columns.length === 0) report(null, 'Choose at least one column to import.')
  if (issues.length > 0) return failed()

  const payloadRows: ImportPayload['rows'] = []
  let skipped = 0
  records.forEach((record, i) => {
    const row = i + 2
    const stray = record.slice(targets.length).some((cell) => cell.trim() !== '')
    if (stray) report(row, `Row ${row} has more cells than the header row.`)
    const values = columns.map(({ index, target, type }) => {
      const converted = convertCell(record[index] ?? '', type)
      if (!converted.ok) {
        const label = target.kind === 'field' ? fieldById.get(target.fieldId)!.name : target.name
        report(row, `Row ${row}, “${label}”: ${converted.message}`)
        return ''
      }
      return converted.value ?? ''
    })
    if (values.every((value) => value === '')) skipped++
    else payloadRows.push(values)
  })

  const cells = payloadRows.length * columns.length
  if (cells > MAX_IMPORT_CELLS) report(null, `An import can have at most ${MAX_IMPORT_CELLS} cells; this one has ${cells}. Skip some columns or split the file.`)
  if (issues.length === 0 && payloadRows.length === 0) report(null, 'Every record is empty in the columns chosen.')
  if (issues.length > 0) return { payload: null, issues, imported: 0, skipped }

  const payloadColumns = columns.map(({ target, type }): ImportColumn =>
    target.kind === 'field' ? { field_id: target.fieldId } : { name: target.name, data_type: type })
  // Empty cells go as "" (not null): the server drops nulls from JSON arrays.
  return { payload: { columns: payloadColumns, rows: payloadRows }, issues, imported: payloadRows.length, skipped }
}
