import type { ImportColumn, ImportPreview } from '@/api/collectionImport'

// What the user picks for an imported key besides a type: leave it out.
export const SKIP = 'skip'

const TYPE_LABELS: Record<string, string> = { datetime: 'Date and time' }

// A field type as people read it: "long_text" is "Long text". The types come from
// the server, so one without a label of its own still shows.
export function importTypeLabel(type: string): string {
  const label = TYPE_LABELS[type] ?? type.replace(/_/g, ' ')
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export interface TypeOption { value: string; label: string }

// What a key can become. A key that matches a field keeps that field's type (or
// is left out), one that cannot take imported values can only be left out, and
// the others can be any type a new field can have.
export function typeOptions(column: ImportColumn, types: string[]): TypeOption[] {
  const skip = { value: SKIP, label: "Don't import" }
  if (!column.importable) return [skip]
  if (column.field_id !== null) return [{ value: column.data_type, label: `${importTypeLabel(column.data_type)} (existing field)` }, skip]
  return [...types.map((type) => ({ value: type, label: importTypeLabel(type) })), skip]
}

// The choice each key starts with: its guess, or skipped when it cannot be imported.
export function initialChoices(preview: ImportPreview): Record<string, string> {
  return Object.fromEntries(preview.columns.map((column) => [column.key, column.importable ? column.data_type : SKIP]))
}

// The columns to send: every key not left out.
export function chosenColumns(preview: ImportPreview, choices: Record<string, string>): { key: string; data_type: string }[] {
  return preview.columns
    .filter((column) => column.importable && (choices[column.key] ?? SKIP) !== SKIP)
    .map((column) => ({ key: column.key, data_type: choices[column.key] }))
}

// "3 records" / "1 record".
export function recordCount(count: number): string {
  return `${count} ${count === 1 ? 'record' : 'records'}`
}

// What the field line says about a key: the existing field it fills (named when
// the match ignored case) or that it makes a new one.
export function columnNote(column: ImportColumn): string {
  if (!column.importable) return `Can't import into a ${importTypeLabel(column.data_type).toLowerCase()} field`
  if (column.field_id === null) return 'New field'
  return column.field_name && column.field_name !== column.key ? `Existing field “${column.field_name}”` : 'Existing field'
}
