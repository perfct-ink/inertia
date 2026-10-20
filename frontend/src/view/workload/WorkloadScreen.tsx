import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { AlertTriangle, Gauge, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useTasks } from '@/api/tasks'
import { useWorkspaceMembers } from '@/api/workspaces'
import { DEFAULT_WEEKLY_CAPACITY, weekRange, workload } from '@/data/workload'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceStore } from '@/store/workspaces'
import '../planning/PlanningScreen.scss'
import './WorkloadScreen.scss'

const WEEKS = 8

// Estimated hours per person per week for the next eight weeks, from open tasks'
// estimates spread over their dates. A week over the weekly capacity is marked.
export default function WorkloadScreen() {
  usePageTitle('Workload')
  const { data: tasks = [], isLoading } = useTasks()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const [capacity, setCapacity] = useState(DEFAULT_WEEKLY_CAPACITY)
  const weeks = weekRange(format(new Date(), 'yyyy-MM-dd'), WEEKS)
  const result = workload(tasks, weeks, capacity)
  const names = new Map(members.map((m) => [m.user_id, m.user.name]))
  const nameOf = (id: number | null) => (id === null ? 'Unassigned' : names.get(id) ?? `User ${id}`)

  return (
    <WorkspaceLayout>
      <div className="view-planning view-workload">
        <div className="planning-header">
          <h1 className="planning-title">Workload</h1>
          <label>
            Hours per week
            <Input type="number" min={1} aria-label="Weekly capacity in hours" value={capacity} onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || DEFAULT_WEEKLY_CAPACITY))} />
          </label>
        </div>
        <div className="planning-body">
          {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
          {!isLoading && result.rows.length === 0 && (
            <div className="planning-empty">
              <Gauge className="planning-empty_icon" aria-hidden="true" />
              <p>Nothing to show yet. Give open tasks an estimate (hours) and a due date to see the load per person.</p>
            </div>
          )}
          {result.rows.length > 0 && (
            <table className="workload-table">
              <thead>
                <tr>
                  <th scope="col">Person</th>
                  {weeks.map((w) => <th key={w} scope="col">{format(parseISO(w), 'MMM d')}</th>)}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.assigneeId ?? 'none'}>
                    <th scope="row">{nameOf(row.assigneeId)}</th>
                    {row.hours.map((h, i) => (
                      <td key={weeks[i]} className={row.over[i] > 0 ? 'workload-cell--over' : undefined}>
                        {h > 0 ? `${h} h` : ''}
                        {row.over[i] > 0 && <span className="workload-warning"><AlertTriangle className="workload-icon" aria-hidden="true" /> over by {row.over[i]} h</span>}
                      </td>
                    ))}
                    <td>{row.total} h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {result.unplanned > 0 && <p className="planning-date">{result.unplanned} open {result.unplanned === 1 ? 'task is' : 'tasks are'} not counted: no estimate or due date.</p>}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
