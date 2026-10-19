import type { DataType } from '@/api/tables'

// Types an imported key can become (relations need another collection, so they
// are not offered here).
export const IMPORT_TYPES: { value: DataType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'integer', label: 'Integer' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date', label: 'Date' },
  { value: 'datetime', label: 'Date and time' },
]
