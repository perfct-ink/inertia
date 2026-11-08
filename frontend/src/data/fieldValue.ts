import { isValidISODate } from '@/util/calendar'

// What a plain scalar value is and how it can be shown, for everything that
// stores one: Collection types and custom task fields of the same name. Mirrors
// FieldValue in backend/app/models/field_value.rb; both are checked against the
// same cases in fieldValue.vectors.json (fieldValue.test.ts).
//
// A value is always stored plain; a type's format only changes how it is shown.
// Where a type has several formats the first is the default and a field picks
// one. A format picker is offered only for a type with more than one format.
//
// The names and signatures (isValidValue, formatsOf, hasFormatChoice,
// defaultFormat, formatKey, formatChoiceLabel, formatValue, groupDigits) are the
// ones data/fieldType.ts uses on the backlog/collection-field-types branch.
// That file imports from data/taskField.ts, so once it merges data/taskField.ts
// must not import it back: make fieldType.ts delegate its text, integer, number,
// boolean, date and datetime cases to this file instead of keeping a second copy.

export type ScalarType = 'text' | 'integer' | 'number' | 'boolean' | 'date' | 'datetime'

// A way to show a type's values: `label` names it and `example` is how it reads.
export interface FormatOption { key: string; label: string; example: string }

const NUMBER_FORMATS: FormatOption[] = [
  { key: 'plain', label: 'Plain', example: '1234.5' },
  { key: 'commas', label: 'With commas', example: '1,234.5' },
]

const FORMATS: Record<string, FormatOption[]> = {
  integer: [{ key: 'plain', label: 'Plain', example: '1234' }, { key: 'commas', label: 'With commas', example: '1,234' }],
  number: NUMBER_FORMATS,
}

export const formatsOf = (type: string): FormatOption[] => FORMATS[type] ?? []

// A type has a format picker only when there is a choice.
export const hasFormatChoice = (type: string): boolean => formatsOf(type).length > 1

export const defaultFormat = (type: string): string | null => formatsOf(type)[0]?.key ?? null

// The format a field shows: its own when it is one of the type's, else the default.
export function formatKey(type: string, format?: string | null): string | null {
  return formatsOf(type).some((option) => option.key === format) ? (format as string) : defaultFormat(type)
}

// A format as the picker lists it: "With commas: 1,234.5".
export const formatChoiceLabel = (option: FormatOption): string => `${option.label}: ${option.example}`

const DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

function isDatetime(value: unknown): boolean {
  const match = typeof value === 'string' ? DATETIME.exec(value) : null
  return !!match && isValidISODate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4]) < 60
}

const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

// Whether a plain value fits a type. false and 0 are real values.
export function isValidValue(type: string, value: unknown): boolean {
  switch (type) {
    case 'text': return typeof value === 'string'
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'number': return isNumber(value)
    case 'boolean': return typeof value === 'boolean'
    case 'date': return typeof value === 'string' && isValidISODate(value)
    case 'datetime': return isDatetime(value)
    default: return false
  }
}

// Inserts commas into the whole part of a number's text: "-1234567.8" is "-1,234,567.8".
export function groupDigits(text: string): string {
  return text.replace(/^(-?)(\d+)/, (_, sign: string, digits: string) => sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','))
}

// The text of a value in its field's format, or null when it is shown as stored.
// Same answers as the cases in fieldValue.vectors.json.
export function formatValue(type: string, format: string | null | undefined, value: unknown): string | null {
  if (!isNumber(value)) return null
  if ((type === 'integer' || type === 'number') && formatKey(type, format) === 'commas') return groupDigits(String(value))
  return null
}
