import { isValidISODate } from '@/util/calendar'
import { MAX_LABEL_LENGTH, MAX_OPTIONS, tidyLabels } from '@/data/taskField'
import type { CellValue, FieldDataType, TableField } from '@/api/tables'

// What each Collection field type is called, how it can be shown, what it
// accepts and how typed text is read into the plain value that is stored.
// Mirrors FieldType in backend/app/models/field_type.rb; both are checked
// against the same cases in fieldType.vectors.json (fieldType.test.ts).
//
// A field has a type, and a type can have formats (money: US dollars, euros...).
// A value is always stored plain (money as a number, a phone as its digits);
// the format only changes how the grid shows it. A format picker is offered
// only for a type with more than one format, and the first format is the default.

// VALUE: a cell holds it. LINKED: a cell holds it and the server also checks it
// against other records. AUTOMATIC: a number the server assigns. DERIVED: read
// from the record. COMPUTED: worked out by the editor.
export type FieldKind = 'value' | 'linked' | 'automatic' | 'derived' | 'computed' | 'mirrored'

// A way to show a type's values: `label` names it and `example` is how it reads.
export interface FormatOption { key: string; label: string; example: string }

export interface FieldTypeInfo {
  label: string
  kind: FieldKind
  formats: FormatOption[]
  // What to tell someone whose value does not fit; types that are not checked here have none.
  problem?: string
  // A line of help shown under the type picker when the type is chosen.
  hint?: string
}

const formats = (...options: [string, string, string][]): FormatOption[] => options.map(([key, label, example]) => ({ key, label, example }))

export const FIELD_TYPES: Record<FieldDataType, FieldTypeInfo> = {
  text: { label: 'Text', kind: 'value', formats: [] },
  long_text: { label: 'Long text', kind: 'value', formats: [], problem: 'is too long' },
  email: { label: 'Email', kind: 'value', formats: [], problem: 'needs an email address like name@example.com' },
  phone: {
    label: 'Phone', kind: 'value', problem: 'needs a phone number of 7 to 15 digits',
    formats: formats(['parentheses', 'Parentheses', '(555) 123-4567'], ['dashes', 'Dashes', '555-123-4567']),
  },
  url: { label: 'URL', kind: 'value', formats: [], problem: 'needs a web address starting with http:// or https://' },
  person_name: { label: 'Person name', kind: 'value', formats: [], problem: 'needs a name made of letters' },
  username: { label: 'Username', kind: 'value', formats: [], problem: 'needs 3 to 30 letters, digits, dots, dashes or underscores' },
  alphanumeric: { label: 'Code (letters and digits)', kind: 'value', formats: [], problem: 'needs letters and digits only' },
  integer: { label: 'Integer', kind: 'value', formats: formats(['plain', 'Plain', '1234'], ['commas', 'With commas', '1,234']), problem: 'needs a whole number' },
  number: { label: 'Number', kind: 'value', formats: formats(['plain', 'Plain', '1234.5'], ['commas', 'With commas', '1,234.5']), problem: 'needs a number' },
  money: {
    label: 'Money', kind: 'value', problem: 'needs an amount with at most two decimals',
    formats: formats(['usd', 'US dollars', '$1,250.00'], ['eur', 'Euros', '€1,250.00'], ['gbp', 'Pounds', '£1,250.00'], ['jpy', 'Yen', '¥1,250']),
  },
  mileage: {
    label: 'Mileage', kind: 'value', problem: 'needs a distance of 0 or more',
    formats: formats(['miles', 'Miles', '42,000 mi'], ['kilometers', 'Kilometers', '42,000 km']),
  },
  percent: { label: 'Percent', kind: 'value', formats: [], problem: 'needs a number from 0 to 100' },
  rating: { label: 'Rating', kind: 'value', problem: 'needs a rating from 1 to 5', formats: formats(['stars', 'Stars', '★★★★☆'], ['number', 'Number', '4 / 5']) },
  boolean: { label: 'Boolean', kind: 'value', formats: [] },
  date: { label: 'Date', kind: 'value', formats: [], problem: 'needs a date like 2026-11-07' },
  datetime: { label: 'Date and time', kind: 'value', formats: [], problem: 'needs a date and time' },
  month: {
    label: 'Month', kind: 'value', problem: 'needs a month from 1 to 12',
    formats: formats(['name', 'Name', 'March'], ['short', 'Short name', 'Mar'], ['number', 'Number', '03']),
  },
  year: { label: 'Year', kind: 'value', formats: [], problem: 'needs a four digit year' },
  single_select: { label: 'Single select', kind: 'value', formats: [], problem: 'needs one of the field’s choices' },
  multi_select: { label: 'Multi select', kind: 'value', formats: [], problem: 'needs choices from the field’s list' },
  person: { label: 'Person', kind: 'linked', formats: [], hint: 'One person who can open this Space.' },
  color: { label: 'Color', kind: 'value', formats: [], problem: 'needs a color like #0d9488' },
  relation: { label: 'Relation', kind: 'linked', formats: [] },
  file: { label: 'File', kind: 'linked', formats: [] },
  files: { label: 'Files', kind: 'linked', formats: [] },
  formula: { label: 'Formula', kind: 'computed', formats: [] },
  mirror: { label: 'Lookup', kind: 'mirrored', formats: [], hint: 'Shows a field of the record a relation field links to. It cannot be edited.' },
  auto_number: {
    label: 'Auto-number', kind: 'automatic', formats: formats(['plain', 'Plain', '1, 2, 3'], ['padded', 'Padded', '0001, 0002']),
    hint: 'Numbers each record 1, 2, 3 in the order made, including the records already here. A number is never used twice, and the field cannot change type.',
  },
  created_time: {
    label: 'Created time', kind: 'derived', hint: 'When each record was made (UTC). It cannot be edited.',
    formats: formats(['date_time', 'Date and time', '2026-11-07 14:30'], ['date', 'Date', '2026-11-07']),
  },
  updated_time: {
    label: 'Updated time', kind: 'derived', hint: 'When each record last changed (UTC). It cannot be edited.',
    formats: formats(['date_time', 'Date and time', '2026-11-07 14:30'], ['date', 'Date', '2026-11-07']),
  },
}

// The order of the type picker: text, numbers, dates, choices, then links and fields filled in by the app.
export const DATA_TYPES = Object.keys(FIELD_TYPES) as FieldDataType[]

export const typeLabel = (type: FieldDataType): string => FIELD_TYPES[type]?.label ?? type

export const formatsOf = (type: FieldDataType): FormatOption[] => FIELD_TYPES[type]?.formats ?? []

// A type has a format picker only when there is a choice.
export const hasFormatChoice = (type: FieldDataType): boolean => formatsOf(type).length > 1

export const defaultFormat = (type: FieldDataType): string | null => formatsOf(type)[0]?.key ?? null

// The format a field shows: its own when it is one of the type's, else the default.
export function formatKey(type: FieldDataType, format?: string | null): string | null {
  return formatsOf(type).some((option) => option.key === format) ? (format as string) : defaultFormat(type)
}

// "Money · Euros": the type, and the format when it is not the default. For a column header.
export function fieldTypeText(field: Pick<TableField, 'data_type' | 'display_format'>): string {
  const base = typeLabel(field.data_type)
  const chosen = formatsOf(field.data_type).find((option) => option.key === field.display_format)
  return chosen && chosen.key !== defaultFormat(field.data_type) ? `${base} · ${chosen.label}` : base
}

// A format as the picker lists it: "Euros: €1,250.00".
export const formatChoiceLabel = (option: FormatOption): string => `${option.label}: ${option.example}`

// Types whose choices live on the field.
export const hasChoices = (type: FieldDataType): boolean => type === 'single_select' || type === 'multi_select'

// Nothing can be typed into these: they are worked out, read from the record, or numbered by the server.
export const isReadOnly = (type: FieldDataType): boolean => ['computed', 'derived', 'automatic', 'mirrored'].includes(FIELD_TYPES[type]?.kind)

// Number columns a summary row can add up.
export const isSummarizable = (type: FieldDataType): boolean => ['integer', 'number', 'money', 'mileage', 'percent'].includes(type)

// A "unit" (kg, $) is for plain numbers; money, mileage and percent say their own.
export const hasUnit = (type: FieldDataType): boolean => type === 'integer' || type === 'number'

// The first problem with the choices typed for a select field, or null when they are fine.
export function choicesProblem(options: string[]): string | null {
  const choices = tidyLabels(options)
  if (choices.length === 0) return 'Add at least one choice.'
  if (choices.length > MAX_OPTIONS) return `A select can have at most ${MAX_OPTIONS} choices.`
  if (choices.some((choice) => choice.length > MAX_LABEL_LENGTH)) return `Choices are at most ${MAX_LABEL_LENGTH} characters.`
  return null
}

// ── Checking a plain value ───────────────────────────────────────────────────

const MAX_SHORT_TEXT = 255
const MAX_LONG_TEXT = 20_000
const MAX_NUMBER = 1_000_000_000_000
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const RATING_MAX = 5

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const PHONE = /^\+?\d{7,15}$/
const PHONE_TEXT = /^\+?[\d\s().-]+$/
const URL = /^https?:\/\/[^\s]+$/
const USERNAME = /^[A-Za-z0-9_.-]{3,30}$/
const PERSON_NAME = /^\p{L}[\p{L}\s'.-]*$/u
const ALPHANUMERIC = /^[A-Za-z0-9]+$/
const COLOR = /^#[0-9a-f]{6}$/
const NUMBER_TEXT = /^[-+]?(\d{1,3}(,\d{3})+|\d+)?(\.\d+)?$/
const DATETIME = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(\.\d+)?(Z|[+-]\d{2}:\d{2})$/

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const numberIn = (v: unknown, min: number, max: number): boolean => isNumber(v) && v >= min && v <= max
const integerIn = (v: unknown, min: number, max: number): boolean => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max
const shortText = (v: unknown, pattern: RegExp): boolean => typeof v === 'string' && v.length <= MAX_SHORT_TEXT && pattern.test(v)
const isId = (v: unknown): boolean => integerIn(v, 1, Number.MAX_SAFE_INTEGER)

function isDatetime(v: unknown): boolean {
  const match = typeof v === 'string' ? DATETIME.exec(v) : null
  return !!match && isValidISODate(match[1]) && Number(match[2]) < 24 && Number(match[3]) < 60 && Number(match[4]) < 60
}

// Whether a plain value fits a type. `options` are the field's choices.
export function isValidValue(type: FieldDataType, value: unknown, options: readonly string[] = []): boolean {
  switch (type) {
    case 'text': return typeof value === 'string'
    case 'long_text': return typeof value === 'string' && value.length <= MAX_LONG_TEXT
    case 'integer': return typeof value === 'number' && Number.isInteger(value)
    case 'number': return isNumber(value)
    case 'boolean': return typeof value === 'boolean'
    case 'date': return typeof value === 'string' && isValidISODate(value)
    case 'datetime': return isDatetime(value)
    case 'email': return shortText(value, EMAIL)
    case 'phone': return typeof value === 'string' && PHONE.test(value)
    case 'url': return typeof value === 'string' && value.length <= 2048 && URL.test(value)
    case 'username': return shortText(value, USERNAME)
    case 'person_name': return shortText(value, PERSON_NAME)
    case 'alphanumeric': return shortText(value, ALPHANUMERIC)
    case 'color': return shortText(value, COLOR)
    case 'money': return numberIn(value, -MAX_NUMBER, MAX_NUMBER) && Math.round((value as number) * 100) / 100 === value
    case 'mileage': return numberIn(value, 0, MAX_NUMBER)
    case 'percent': return numberIn(value, 0, 100)
    case 'rating': return integerIn(value, 1, RATING_MAX)
    case 'month': return integerIn(value, 1, 12)
    case 'year': return integerIn(value, 1000, 9999)
    case 'single_select': return typeof value === 'string' && options.includes(value)
    case 'multi_select':
      return Array.isArray(value) && value.length > 0 && value.length <= MAX_OPTIONS && new Set(value).size === value.length && value.every((choice) => options.includes(choice))
    case 'relation': return value === null
    case 'person': case 'file': return isId(value)
    case 'files': return Array.isArray(value) && value.every(isId)
    case 'auto_number': return isId(value)
    default: return false
  }
}

// ── Reading what someone typed into a plain value ───────────────────────────
// Anything that cannot be read is returned unchanged, so the check rejects it.
// Types not listed (and the original text, number and date types) are kept as given.

function plainNumber(value: unknown, remove: RegExp | null, suffix: RegExp | null = null): unknown {
  if (typeof value !== 'string') return value
  let text = value.trim()
  if (suffix) text = text.replace(suffix, '')
  if (remove) text = text.replace(remove, '')
  if (!(text.length <= 20 && NUMBER_TEXT.test(text) && /\d/.test(text))) return value
  return Number(text.replace(/,/g, ''))
}

const plainInteger = (value: unknown): unknown => (typeof value === 'string' && /^\d{1,9}$/.test(value.trim()) ? Number(value.trim()) : value)

function plainMonth(value: unknown): unknown {
  if (typeof value !== 'string') return value
  const text = value.trim()
  if (/^\d{1,2}$/.test(text)) return Number(text)
  const wanted = text.toLowerCase()
  const index = MONTH_NAMES.findIndex((name) => name.toLowerCase() === wanted || name.slice(0, 3).toLowerCase() === wanted)
  return index >= 0 ? index + 1 : value
}

function plainChoices(value: unknown): unknown {
  const list = typeof value === 'string' ? value.split(',') : value
  return Array.isArray(list) && list.every((item) => typeof item === 'string') ? tidyLabels(list as string[]) : value
}

export function normalizeValue(type: FieldDataType, value: unknown): unknown {
  switch (type) {
    case 'email': case 'url': case 'username': case 'alphanumeric': case 'single_select':
      return typeof value === 'string' ? value.trim() : value
    case 'person_name': return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : value
    case 'phone': {
      if (typeof value !== 'string') return value
      const text = value.trim()
      return PHONE_TEXT.test(text) ? text.replace(/[\s().-]/g, '') : text
    }
    case 'color': {
      if (typeof value !== 'string') return value
      const text = value.trim().toLowerCase()
      return /^[0-9a-f]{6}$/.test(text) ? `#${text}` : text
    }
    case 'money': return plainNumber(value, /[$€£¥ ]/g)
    case 'mileage': return plainNumber(value, null, /\s*(mi|miles|km|kilometers)$/i)
    case 'percent': return plainNumber(value, /[% ]/g)
    case 'rating': case 'year': return plainInteger(value)
    case 'month': return plainMonth(value)
    case 'multi_select': return plainChoices(value)
    default: return value
  }
}

// Text typed into a cell, as the value to keep. A number or integer is a number
// input unless it is shown with commas, in which case the text is read here ("1,234" is 1234).
export function readTyped(type: FieldDataType, text: string): unknown {
  return type === 'integer' || type === 'number' ? plainNumber(text, null) : normalizeValue(type, text)
}

// ── Showing a plain value in its format ──────────────────────────────────────

const CURRENCIES: Record<string, { symbol: string; decimals: number }> = {
  usd: { symbol: '$', decimals: 2 },
  eur: { symbol: '€', decimals: 2 },
  gbp: { symbol: '£', decimals: 2 },
  jpy: { symbol: '¥', decimals: 0 },
}

// 12 for 12.0, otherwise the number as JavaScript prints it.
const numberText = (value: number): string => String(value)

export function groupDigits(text: string): string {
  return text.replace(/^(-?)(\d+)/, (_, sign: string, digits: string) => sign + digits.replace(/\B(?=(\d{3})+(?!\d))/g, ','))
}

// Money rounds half up on whole cents (or whole units for yen), the same way as on the server.
function moneyText(value: number, currency: { symbol: string; decimals: number }): string {
  const amount = Math.abs(value)
  let body: string
  if (currency.decimals === 0) {
    body = groupDigits(String(Math.floor(amount + 0.5)))
  } else {
    const cents = Math.round(amount * 100)
    body = `${groupDigits(String(Math.floor(cents / 100)))}.${String(cents % 100).padStart(2, '0')}`
  }
  return `${value < 0 ? '-' : ''}${currency.symbol}${body}`
}

// Ten digits are a US number; a leading 1 (with or without +) is the country code. Anything else is shown as stored.
function phoneText(value: string, format: string | null): string {
  const digits = value.replace(/\+/g, '')
  let prefix: string
  let national: string
  if (digits.length === 10 && !value.startsWith('+')) {
    prefix = ''
    national = digits
  } else if (digits.length === 11 && digits.startsWith('1')) {
    prefix = '+1 '
    national = digits.slice(1)
  } else {
    return value
  }
  const [area, exchange, line] = [national.slice(0, 3), national.slice(3, 6), national.slice(6, 10)]
  return format === 'dashes' ? `${prefix}${area}-${exchange}-${line}` : `${prefix}(${area}) ${exchange}-${line}`
}

function monthText(value: number, format: string | null): string {
  const name = MONTH_NAMES[value - 1]
  if (format === 'short') return name.slice(0, 3)
  if (format === 'number') return String(value).padStart(2, '0')
  return name
}

// "2026-11-07T14:30:00Z" as "2026-11-07 14:30" or "2026-11-07" (UTC).
function timeText(value: unknown, format: string | null): string {
  if (typeof value !== 'string' || value.length < 16) return String(value)
  return format === 'date' ? value.slice(0, 10) : `${value.slice(0, 10)} ${value.slice(11, 16)}`
}

// The text of a value in its field's format, or null when it is shown as stored.
// Same answers as FieldType.display on the server.
export function formatValue(type: FieldDataType, format: string | null | undefined, value: unknown): string | null {
  if (value === null || value === undefined) return null
  const chosen = formatKey(type, format)
  switch (type) {
    case 'integer': case 'number': return chosen === 'commas' && isNumber(value) ? groupDigits(numberText(value)) : null
    case 'money': return isNumber(value) ? moneyText(value, CURRENCIES[chosen ?? 'usd']) : null
    case 'mileage': return isNumber(value) ? `${groupDigits(numberText(value))} ${chosen === 'kilometers' ? 'km' : 'mi'}` : null
    case 'percent': return isNumber(value) ? `${numberText(value)}%` : null
    case 'phone': return typeof value === 'string' ? phoneText(value, chosen) : null
    case 'rating':
      if (!integerIn(value, 1, RATING_MAX)) return null
      return chosen === 'number' ? `${value} / ${RATING_MAX}` : '★'.repeat(value as number) + '☆'.repeat(RATING_MAX - (value as number))
    case 'month': return integerIn(value, 1, 12) ? monthText(value as number, chosen) : null
    case 'auto_number': return chosen === 'padded' && isNumber(value) ? String(value).padStart(4, '0') : null
    case 'multi_select': return Array.isArray(value) ? value.join(', ') : null
    case 'created_time': case 'updated_time': return timeText(value, chosen)
    default: return null
  }
}

export interface DisplayContext {
  // Space members by user id, for a person field.
  people?: ReadonlyMap<number, string>
}

// What the grid and the map's details print for a value: its format, else the value as it is.
export function displayValue(field: Pick<TableField, 'data_type' | 'display_format'>, value: CellValue | undefined, context: DisplayContext = {}): string {
  if (value === null || value === undefined || value === '') return ''
  const formatted = formatValue(field.data_type, field.display_format, value)
  if (formatted !== null) return formatted
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (field.data_type === 'person' && typeof value === 'number') return context.people?.get(value) ?? `Member #${value}`
  if (field.data_type === 'relation') return `Record #${value}`
  return String(value)
}

// ── Checking what a record is about to save ──────────────────────────────────

// The first problem with a value about to be saved ("Email needs an email address like..."), or null.
// What was typed is read into the plain value first. Blank values are fine (they clear the cell);
// linked and read-only types are checked by the server.
export function valueProblem(field: Pick<TableField, 'name' | 'data_type' | 'options'>, value: CellValue | undefined): string | null {
  const info = FIELD_TYPES[field.data_type]
  if (!info?.problem || value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null
  return isValidValue(field.data_type, normalizeValue(field.data_type, value), field.options ?? []) ? null : `${field.name} ${info.problem}.`
}

// A record's typed values as the plain values to save: each read into its type's plain
// form, and without the fields the app fills in (formulas, auto-numbers, created and updated times).
export function plainValues(fields: TableField[], values: Record<string, CellValue>): Record<string, CellValue> {
  return Object.fromEntries(
    fields
      .filter((field) => !isReadOnly(field.data_type) && String(field.id) in values)
      .map((field): [number, CellValue] => [field.id, normalizeValue(field.data_type, values[field.id]) as CellValue]),
  )
}

// The first problem among a record's plain values (see valueProblem), or null.
export function recordProblem(fields: TableField[], values: Record<string, CellValue>): string | null {
  for (const field of fields) {
    const problem = valueProblem(field, values[field.id])
    if (problem) return problem
  }
  return null
}
