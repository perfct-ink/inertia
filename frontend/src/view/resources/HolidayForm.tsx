import { useState, type FormEvent } from 'react'
import { Button, DatePicker, FormError, Input } from '@/components/ui'
import { useCreateHoliday } from '@/api/holidays'
import { holidayError } from '@/data/resource'

// Adds a holiday for the whole Space. The end date is optional: leave it empty
// for a single day.
export default function HolidayForm({ today }: { today: string }) {
  const create = useCreateHoliday()
  const [name, setName] = useState('')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = holidayError({ name, start, end })
    setError(problem ?? '')
    if (problem) return
    create.mutate(
      { name: name.trim(), start_date: start, end_date: end || start },
      { onSuccess: () => { setName(''); setEnd('') } },
    )
  }

  return (
    <form onSubmit={submit} className="resources-form" noValidate>
      <label className="resources-field resources-field--project">
        <span>Holiday</span>
        <Input aria-label="Holiday name" maxLength={255} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label className="resources-field">
        <span>From</span>
        <DatePicker aria-label="Holiday start date" value={start} onChange={(e) => setStart(e.target.value)} className="resources-date" />
      </label>
      <label className="resources-field">
        <span>Until (optional)</span>
        <DatePicker aria-label="Holiday end date" value={end} onChange={(e) => setEnd(e.target.value)} className="resources-date" />
      </label>
      <Button type="submit" variant="primary" aria-label="Add holiday" disabled={create.isPending} className="resources-submit">Add holiday</Button>
      <FormError message={error} className="resources-form-error" />
    </form>
  )
}
