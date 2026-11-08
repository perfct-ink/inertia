import type { TableField } from '@/api/tables'
import { formatValue } from '@/data/fieldType'

export type SummaryKind = 'none' | 'sum' | 'average' | 'min' | 'max' | 'count'

export const SUMMARY_LABEL: Record<SummaryKind, string> = {
  none: 'No summary', sum: 'Sum', average: 'Average', min: 'Min', max: 'Max', count: 'Count',
}

// The summary of a column's values: numbers only count (blanks and anything that
// is not a number are skipped); null when there is nothing to summarise.
export function columnSummary(values: unknown[], kind: SummaryKind): number | null {
  const numbers = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
  if (kind === 'none' || numbers.length === 0) return null
  switch (kind) {
    case 'sum': return round(numbers.reduce((a, b) => a + b, 0))
    case 'average': return round(numbers.reduce((a, b) => a + b, 0) / numbers.length)
    case 'min': return Math.min(...numbers)
    case 'max': return Math.max(...numbers)
    case 'count': return numbers.length
  }
}

const round = (n: number) => Math.round(n * 100) / 100

// A number with its unit: "12.5 kg", or "$12.5" when the unit is a currency symbol.
// `shown` is the number already written in the field's format ("1,250").
export function withUnit(value: number | null, unit: string | null | undefined, shown?: string): string {
  if (value === null) return ''
  const text = shown ?? String(value)
  if (!unit) return text
  return /^[$€£¥]$/.test(unit) ? `${unit}${text}` : `${text} ${unit}`
}

// A column's summary as the grid prints it: in the field's format (money as
// $1,250.00) and unit; a count is just a number.
export function summaryText(
  field: Pick<TableField, 'data_type' | 'display_format' | 'unit'>, values: unknown[], kind: SummaryKind,
): string {
  const result = columnSummary(values, kind)
  if (result === null) return ''
  if (kind === 'count') return String(result)
  return withUnit(result, field.unit, formatValue(field.data_type, field.display_format, result) ?? undefined)
}
