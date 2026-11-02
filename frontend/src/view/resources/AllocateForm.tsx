import { useState, type FormEvent } from 'react'
import { Button, FormError, Input, Select } from '@/components/ui'
import { useCreateResourceAllocation } from '@/api/resourceAllocations'
import { allocationError, MAX_WEEKLY_HOURS, parseHours } from '@/data/resource'
import type { Folder } from '@/types'

type AllocateFormProps = {
  userId: number
  person: string
  projects: Folder[]
  // yyyy-MM-dd; the start date a new allocation begins with.
  today: string
}

// Allocates a person to a project for some hours a week. The end date is
// optional: leave it empty for ongoing work.
export default function AllocateForm({ userId, person, projects, today }: AllocateFormProps) {
  const create = useCreateResourceAllocation()
  const [folderId, setFolderId] = useState('')
  const [hours, setHours] = useState('')
  const [start, setStart] = useState(today)
  const [end, setEnd] = useState('')
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const problem = allocationError({ folderId, hours, start, end })
    const hoursPerWeek = parseHours(hours)
    setError(problem ?? '')
    if (problem || hoursPerWeek === null) return
    create.mutate(
      { user_id: userId, folder_id: Number(folderId), hours_per_week: hoursPerWeek, start_date: start || null, end_date: end || null },
      { onSuccess: () => { setFolderId(''); setHours(''); setEnd('') } },
    )
  }

  return (
    <form onSubmit={submit} className="resources-form" noValidate>
      <label className="resources-field resources-field--project">
        <span>Project</span>
        <Select aria-label={`Project for ${person}`} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
          <option value="">Choose a project</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
        </Select>
      </label>
      <label className="resources-field">
        <span>Hours per week</span>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_WEEKLY_HOURS}
          step="0.5"
          aria-label={`Hours per week to allocate ${person}`}
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          className="resources-hours"
        />
      </label>
      <label className="resources-field">
        <span>From</span>
        <Input type="date" aria-label={`Start date to allocate ${person}`} value={start} onChange={(e) => setStart(e.target.value)} className="resources-date" />
      </label>
      <label className="resources-field">
        <span>Until (optional)</span>
        <Input type="date" aria-label={`End date to allocate ${person}`} value={end} onChange={(e) => setEnd(e.target.value)} className="resources-date" />
      </label>
      <Button type="submit" variant="primary" aria-label={`Allocate ${person}`} disabled={create.isPending} className="resources-submit">Allocate</Button>
      <FormError message={error} className="resources-form-error" />
    </form>
  )
}
