import type { CellValue, TableData, TableField, TableRecord } from '@/api/tables'

// How a record is named in a list: its first text value, or its number.
export function recordLabel(fields: TableField[], record: TableRecord): string {
  const labelField = fields.find((f) => f.data_type === 'text')
  const value = labelField ? record.values[labelField.id] : null
  return value ? `#${record.id} · ${value}` : `#${record.id}`
}

// The linked record ids in a relation cell, whether it holds one or many.
export function linkedIds(value: CellValue | undefined): number[] {
  if (Array.isArray(value)) return value
  return typeof value === 'number' ? [value] : []
}

// The ids picked in a <select multiple>.
export function pickedIds(options: Iterable<{ selected: boolean; value: string }>): number[] {
  return [...options].filter((o) => o.selected).map((o) => Number(o.value))
}

// Linked records as one line of labels, for a table cell or summary.
export function linkedLabels(target: TableData | undefined, value: CellValue | undefined): string[] {
  if (!target) return []
  return linkedIds(value).flatMap((id) => {
    const row = target.records.find((r) => r.id === id)
    return row ? [recordLabel(target.fields, row)] : []
  })
}

// The single-valued or list-valued field is a relation that can hold many.
export function holdsMany(field: Pick<TableField, 'data_type' | 'allow_many'>): boolean {
  return field.data_type === 'relation' && !!field.allow_many
}
