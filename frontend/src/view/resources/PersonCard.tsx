import { useState } from 'react'
import { CalendarOff, TriangleAlert } from 'lucide-react'
import { FormError, Input } from '@/components/ui'
import { useUpdateMemberCapacity } from '@/api/workspaceMembers'
import { CAPACITY_ERROR, daysOffLabel, daysOffReason, formatHours, loadPercent, MAX_WEEKLY_HOURS, parseHours, weekLabel, weekNote } from '@/data/resource'
import type { PersonLoad, WeekLoad } from '@/data/resource'
import type { Folder } from '@/types'
import AllocateForm from './AllocateForm'
import AllocationRow from './AllocationRow'

type PersonCardProps = {
  load: PersonLoad
  workspaceId: number
  // The projects people can be allocated to.
  projects: Folder[]
  projectName: (folderId: number) => string
  canManage: boolean
  isMe: boolean
  today: string
}

// One person: their weekly capacity, hours allocated in each visible week and
// the projects they are on.
export default function PersonCard({ load, workspaceId, projects, projectName, canManage, isMe, today }: PersonCardProps) {
  return (
    <section className="resources-card" aria-labelledby={`resources-person-${load.userId}`}>
      <div className="resources-card-top">
        <h2 id={`resources-person-${load.userId}`} className="resources-card-title">{load.name}{isMe ? ' (you)' : ''}</h2>
        {canManage
          ? <CapacityField load={load} workspaceId={workspaceId} />
          : <span className="resources-card-meta">{formatHours(load.capacity)} h/week capacity</span>}
      </div>

      <ul className="resources-weeks" aria-label={`Hours per week for ${load.name}, by week starting Monday`}>
        {load.weeks.map((week) => <WeekCell key={week.week} week={week} />)}
      </ul>

      {load.allocations.length > 0 && (
        <ul className="resources-allocations" aria-label={`Projects for ${load.name}`}>
          {load.allocations.map((allocation) => (
            <AllocationRow
              key={allocation.id}
              allocation={allocation}
              person={load.name}
              projectName={projectName(allocation.folder_id)}
              canManage={canManage}
            />
          ))}
        </ul>
      )}

      {canManage && projects.length > 0 && <AllocateForm userId={load.userId} person={load.name} projects={projects} today={today} />}
    </section>
  )
}

// A week's hours against that week's capacity (the weekly capacity less days
// off, said in words under the note). Over-allocation is said in words and an
// icon as well as the red bar, so it doesn't rely on colour.
function WeekCell({ week }: { week: WeekLoad }) {
  const over = week.over > 0
  const daysOff = daysOffLabel(week.off)
  return (
    <li className={`resources-week${over ? ' resources-week--over' : ''}`}>
      <span className="resources-week-label">{weekLabel(week.week)}</span>
      <span className="resources-week-hours">{formatHours(week.allocated)} / {formatHours(week.capacity)} h</span>
      <span className="resources-week-bar" aria-hidden="true">
        <span className="resources-week-bar_fill" style={{ width: `${Math.min(100, loadPercent(week.allocated, week.capacity))}%` }} />
      </span>
      <span className="resources-week-note">
        {over && <TriangleAlert className="resources-icon" aria-hidden="true" />}
        {weekNote(week)}
      </span>
      {daysOff && (
        <span className="resources-week-off">
          <CalendarOff className="resources-icon" aria-hidden="true" />
          <span>
            {daysOff}
            <span className="resources-week-reason">{daysOffReason(week.off)}</span>
          </span>
        </span>
      )}
    </li>
  )
}

// Saves when the field loses focus. A rejected value goes back to the saved one
// (the field is remounted with `version`); the failed request shows its own error.
function CapacityField({ load, workspaceId }: { load: PersonLoad; workspaceId: number }) {
  const update = useUpdateMemberCapacity(workspaceId)
  const [error, setError] = useState('')
  const [version, setVersion] = useState(0)
  const restore = () => setVersion((v) => v + 1)

  function commit(text: string) {
    const hours = parseHours(text, { allowZero: true })
    if (hours === null) {
      setError(CAPACITY_ERROR)
      restore()
      return
    }
    setError('')
    if (hours !== load.capacity) update.mutate({ id: load.memberId, hours }, { onError: restore })
  }

  return (
    <div className="resources-capacity">
      <label className="resources-capacity-field">
        <span>Capacity</span>
        <Input
          key={`${load.capacity}-${version}`}
          type="number"
          inputMode="decimal"
          min={0}
          max={MAX_WEEKLY_HOURS}
          step="0.5"
          aria-label={`Weekly capacity in hours for ${load.name}`}
          defaultValue={load.capacity}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
          className="resources-hours"
        />
        <span>h/week</span>
      </label>
      <FormError message={error} />
    </div>
  )
}
