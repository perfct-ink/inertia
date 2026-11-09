import type { SelectHTMLAttributes } from 'react'
import { Select } from '@/components/ui'
import { recurrenceLabel, recurrenceOptions } from '@/data/recurrence'

// The schedule picker (daily, weekly, every 2 weeks, monthly, yearly) that a task's
// Repeat and an ongoing task's check-ins both use. `emptyLabel` words the "no
// schedule" entry. A rule the list doesn't offer (set through the API) is kept
// as an extra entry, so the picker never shows something else than what is saved.
export function RecurrencePicker({ emptyLabel, value, ...props }: { emptyLabel: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  const options = recurrenceOptions(emptyLabel)
  const current = typeof value === 'string' ? value : ''
  if (current && !options.some((o) => o.value === current)) options.push({ value: current, label: recurrenceLabel(current) ?? current })
  return (
    <Select {...props} value={value}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </Select>
  )
}
