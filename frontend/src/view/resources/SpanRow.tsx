import { useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, DatePicker, FormError } from '@/components/ui'
import { spanError, spanPeriod, workingDayCount } from '@/data/resource'

type SpanRowProps = {
  // Names the row's fields for assistive technology, e.g. "Ada, Nov 9 to Nov 13, 2026".
  label: string
  // What the days are for: the person's name or the holiday's name field.
  heading: ReactNode
  start: string
  end: string
  canManage: boolean
  // Saves a changed date; `restore` puts the fields back if the save fails.
  onSave: (changes: { start_date?: string; end_date?: string }, restore: () => void) => void
  onRemove: () => void
  // Extra editable fields (a note) shown before the dates.
  children?: ReactNode
}

// One row of leave or a holiday: who or what it is, the days it covers and
// how many of them are working days. Admins and owners edit the dates in place
// and remove the row; everyone else reads it.
export default function SpanRow({ label, heading, start, end, canManage, onSave, onRemove, children }: SpanRowProps) {
  const [error, setError] = useState('')
  // Bumping this remounts the fields with the saved dates after a refused change.
  const [version, setVersion] = useState(0)
  const restore = () => setVersion((v) => v + 1)
  const days = workingDayCount(start, end)
  const workingDays = `${days} working ${days === 1 ? 'day' : 'days'}`

  // The date field only reports full dates, but typing a year passes through
  // 0002, 0020 and 0202 on the way to 2026, so wait for a four-digit year.
  function commit(field: 'start_date' | 'end_date', value: string) {
    if (value && value < '1000-01-01') return
    const next = field === 'start_date' ? { start: value, end } : { start, end: value }
    const problem = value ? spanError(next) : 'Choose a date.'
    setError(problem ?? '')
    if (problem) {
      restore()
      return
    }
    onSave(field === 'start_date' ? { start_date: value } : { end_date: value }, restore)
  }

  return (
    <li className="resources-span">
      <div className="resources-span-heading">{heading}</div>
      {canManage ? (
        <div className="resources-span-fields">
          {children}
          <label className="resources-field">
            <span>From</span>
            <DatePicker
              key={`start-${start}-${version}`}
              aria-label={`Start date for ${label}`}
              defaultValue={start}
              onChange={(e) => commit('start_date', e.target.value)}
              className="resources-date"
            />
          </label>
          <label className="resources-field">
            <span>Until</span>
            <DatePicker
              key={`end-${end}-${version}`}
              aria-label={`End date for ${label}`}
              defaultValue={end}
              onChange={(e) => commit('end_date', e.target.value)}
              className="resources-date"
            />
          </label>
          <Button variant="ghost" aria-label={`Remove ${label}`} title="Remove" onClick={onRemove} className="resources-remove">
            <X className="resources-icon" aria-hidden="true" />
          </Button>
        </div>
      ) : null}
      <span className="resources-span-period">{canManage ? workingDays : `${spanPeriod({ start_date: start, end_date: end })} · ${workingDays}`}</span>
      <FormError message={error} className="resources-span-error" />
    </li>
  )
}
