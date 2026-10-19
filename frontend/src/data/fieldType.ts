import type { DataType } from '@/api/tables'

// Mirrors FieldType in backend/app/models/field_type.rb: the label, the HTML
// input to edit it with, and how a stored value is shown.
interface FieldTypeInfo {
  label: string
  input: 'text' | 'number' | 'email' | 'tel' | 'url' | 'color' | 'textarea' | 'date' | 'datetime-local'
  step?: string
  min?: number
  max?: number
  format?: (value: string | number) => string
}

export const FIELD_TYPES: Record<DataType, FieldTypeInfo> = {
  text: { label: 'Text', input: 'text' },
  long_text: { label: 'Long text', input: 'textarea' },
  integer: { label: 'Integer', input: 'number', step: '1' },
  number: { label: 'Number', input: 'number', step: 'any' },
  boolean: { label: 'Boolean', input: 'text' },
  date: { label: 'Date', input: 'date' },
  datetime: { label: 'Date and time', input: 'datetime-local' },
  relation: { label: 'Relation', input: 'text' },
  email: { label: 'Email', input: 'email' },
  phone: { label: 'Phone', input: 'tel' },
  url: { label: 'URL', input: 'url' },
  username: { label: 'Username', input: 'text' },
  person_name: { label: 'Person name', input: 'text' },
  alphanumeric: { label: 'Code (letters and digits)', input: 'text' },
  vin: { label: 'VIN', input: 'text' },
  color: { label: 'Color', input: 'color' },
  money: { label: 'Money', input: 'number', step: '0.01', format: (v) => Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) },
  mileage: { label: 'Mileage', input: 'number', step: '1', min: 0, format: (v) => `${Number(v).toLocaleString('en-US')} mi` },
  percent: { label: 'Percent', input: 'number', step: 'any', min: 0, max: 100, format: (v) => `${v}%` },
  rating: { label: 'Rating (1 to 5)', input: 'number', step: '1', min: 1, max: 5, format: (v) => '★'.repeat(Number(v)) + '☆'.repeat(5 - Number(v)) },
  month: { label: 'Month (1 to 12)', input: 'number', step: '1', min: 1, max: 12 },
  year: { label: 'Year', input: 'number', step: '1', min: 1000, max: 9999 },
}

export const DATA_TYPES = Object.keys(FIELD_TYPES) as DataType[]

// Whether the editor stores this type's input as a number rather than text.
export function isNumericType(type: DataType): boolean {
  return ['integer', 'number', 'money', 'mileage', 'percent', 'rating', 'month', 'year'].includes(type)
}

export function formatValue(type: DataType, value: string | number | boolean | null): string {
  if (value === null || value === '') return ''
  const format = FIELD_TYPES[type].format
  return format && (typeof value === 'number' || typeof value === 'string') ? format(value) : String(value)
}
