// Repeat rules a task can have: the RRULE subset the server accepts
// (Recurrence in backend/app/models/recurrence.rb).
export const RECURRENCE_OPTIONS = [
  { value: '', label: 'Does not repeat' },
  { value: 'FREQ=DAILY', label: 'Daily' },
  { value: 'FREQ=WEEKLY', label: 'Weekly' },
  { value: 'FREQ=WEEKLY;INTERVAL=2', label: 'Every 2 weeks' },
  { value: 'FREQ=MONTHLY', label: 'Monthly' },
  { value: 'FREQ=YEARLY', label: 'Yearly' },
] as const

const UNIT: Record<string, string> = { DAILY: 'day', WEEKLY: 'week', MONTHLY: 'month', YEARLY: 'year' }

// "Weekly", "Every 3 days", or null when the rule is empty or unsupported.
export function recurrenceLabel(rule: string | null | undefined): string | null {
  if (!rule) return null
  const known = RECURRENCE_OPTIONS.find((o) => o.value === rule)
  if (known) return known.label
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]))
  const unit = UNIT[parts.FREQ]
  const interval = Number(parts.INTERVAL ?? 1)
  if (!unit || !Number.isInteger(interval) || interval < 1) return null
  return interval === 1 ? `Every ${unit}` : `Every ${interval} ${unit}s`
}
