import { useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from 'lucide-react'
import { Button, FormError, Input } from '@/components/ui'
import { useDeleteResourceAllocation, useUpdateResourceAllocation } from '@/api/resourceAllocations'
import { allocationPeriod, formatHours, HOURS_ERROR, MAX_WEEKLY_HOURS, parseHours } from '@/data/resource'
import type { ResourceAllocation } from '@/types'

type AllocationRowProps = {
  allocation: ResourceAllocation
  person: string
  projectName: string
  canManage: boolean
}

// One allocation in a person's list: the project, hours a week and dates.
// Admins and owners edit it in place; everyone else reads it.
export default function AllocationRow({ allocation, person, projectName, canManage }: AllocationRowProps) {
  const update = useUpdateResourceAllocation()
  const remove = useDeleteResourceAllocation()
  const [error, setError] = useState('')
  // Bumping this remounts the fields with the saved values after a rejected change.
  const [version, setVersion] = useState(0)
  const restore = () => setVersion((v) => v + 1)
  const label = `${person} on ${projectName}`

  function save(changes: { hours_per_week?: number; start_date?: string | null; end_date?: string | null }) {
    update.mutate({ id: allocation.id, ...changes }, { onError: restore })
  }

  // Typing a year passes through 0002, 0020 and 0202 on the way to 2026, so
  // wait for a four-digit year before saving.
  function commitDate(field: 'start_date' | 'end_date', value: string) {
    if (value && value < '1000-01-01') return
    save(field === 'start_date' ? { start_date: value || null } : { end_date: value || null })
  }

  function commitHours(text: string) {
    const hours = parseHours(text)
    if (hours === null) {
      setError(HOURS_ERROR)
      restore()
      return
    }
    setError('')
    if (hours !== allocation.hours_per_week) save({ hours_per_week: hours })
  }

  return (
    <li className="resources-allocation">
      <Link to={`/folders/${allocation.folder_id}`} className="resources-allocation-project resources-link">{projectName}</Link>
      {canManage ? (
        <div className="resources-allocation-fields">
          <label className="resources-field">
            <span>Hours per week</span>
            <Input
              key={`hours-${allocation.hours_per_week}-${version}`}
              type="number"
              inputMode="decimal"
              min={0}
              max={MAX_WEEKLY_HOURS}
              step="0.5"
              aria-label={`Hours per week for ${label}`}
              defaultValue={allocation.hours_per_week}
              onBlur={(e) => commitHours(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
              className="resources-hours"
            />
          </label>
          <label className="resources-field">
            <span>From</span>
            <Input
              key={`start-${allocation.start_date}-${version}`}
              type="date"
              aria-label={`Start date for ${label}`}
              defaultValue={allocation.start_date ?? ''}
              onChange={(e) => commitDate('start_date', e.target.value)}
              className="resources-date"
            />
          </label>
          <label className="resources-field">
            <span>Until</span>
            <Input
              key={`end-${allocation.end_date}-${version}`}
              type="date"
              aria-label={`End date for ${label}`}
              defaultValue={allocation.end_date ?? ''}
              onChange={(e) => commitDate('end_date', e.target.value)}
              className="resources-date"
            />
          </label>
          <Button
            variant="ghost"
            aria-label={`Remove ${label}`}
            title="Remove"
            onClick={() => remove.mutate(allocation.id)}
            className="resources-remove"
          >
            <X className="resources-icon" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <span className="resources-allocation-period">{formatHours(allocation.hours_per_week)} h/week &middot; {allocationPeriod(allocation)}</span>
      )}
      <FormError message={error} />
    </li>
  )
}
