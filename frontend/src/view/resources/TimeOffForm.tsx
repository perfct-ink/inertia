import { useState, type FormEvent } from 'react'
import { Button, DatePicker, FormError, Input, Select } from '@/components/ui'
import { useCreateTimeOff } from '@/api/timeOffs'
import { timeOffError } from '@/data/resource'
import type { PersonLoad } from '@/data/resource'

type TimeOffFormProps = {
  people: PersonLoad[]
  // yyyy-MM-dd; the start date new leave begins with.
  today: string
}

// Records leave for a person in the Space. The end date is optional: leave it
// empty for a single day.
export default function TimeOffForm({ people, today }: TimeOffFormProps) {
  const create = useCreateTimeOff()
  const [userId, setUserId] = useState('')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = timeOffError({ userId, start, end })
    setError(problem ?? '')
    if (problem) return
    create.mutate(
      { user_id: Number(userId), start_date: start, end_date: end || start, note: note.trim() || null },
      { onSuccess: () => { setEnd(''); setNote('') } },
    )
  }

  return (
    <form onSubmit={submit} className="resources-form" noValidate>
      <label className="resources-field resources-field--project">
        <span>Person</span>
        <Select aria-label="Person taking time off" value={userId} onChange={(e) => setUserId(e.target.value)}>
          <option value="">Choose a person</option>
          {people.map((person) => <option key={person.userId} value={person.userId}>{person.name}</option>)}
        </Select>
      </label>
      <label className="resources-field">
        <span>From</span>
        <DatePicker aria-label="Time off start date" value={start} onChange={(e) => setStart(e.target.value)} className="resources-date" />
      </label>
      <label className="resources-field">
        <span>Until (optional)</span>
        <DatePicker aria-label="Time off end date" value={end} onChange={(e) => setEnd(e.target.value)} className="resources-date" />
      </label>
      <label className="resources-field resources-field--project">
        <span>Note (optional)</span>
        <Input aria-label="Time off note" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} />
      </label>
      <Button type="submit" variant="primary" aria-label="Add time off" disabled={create.isPending} className="resources-submit">Add time off</Button>
      <FormError message={error} className="resources-form-error" />
    </form>
  )
}
