import { format, parseISO } from 'date-fns'
import { AlertTriangle, Gauge, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useTasks } from '@/api/tasks'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { formatHours, personLoads, weekRange } from '@/data/resource'
import { workload } from '@/data/workload'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceStore } from '@/store/workspaces'
import { todayISO } from '@/util/date'
import '../planning/PlanningScreen.scss'
import './WorkloadScreen.scss'

const WEEKS = 8

// Estimated hours per person per week for the next eight weeks, from open tasks'
// estimates spread over their dates. A week over that person's own weekly
// capacity (set on the Resources page) is marked.
export default function WorkloadScreen() {
  usePageTitle('Workload')
  const { data: tasks = [], isLoading } = useTasks()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const weeks = weekRange(todayISO(), WEEKS)
  const people = personLoads(members, [], weeks)
  const result = workload(tasks, weeks, people)
  const nameOf = (id: number | null) => (id === null ? 'Unassigned' : people.find((p) => p.userId === id)?.name ?? `User ${id}`)
  const capacityOf = (id: number | null) => people.find((p) => p.userId === id)?.capacity

  return (
    <WorkspaceLayout>
      <div className="view-planning view-workload">
        <div className="planning-header">
          <h1 className="planning-title">Workload</h1>
          <p className="workload-hint">
            Each person&apos;s weekly capacity is set on the <Link to="/resources" className="workload-link">Resources page</Link>.
          </p>
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
                {result.rows.map((row) => {
                  const capacity = capacityOf(row.assigneeId)
                  return (
                    <tr key={row.assigneeId ?? 'none'}>
                      <th scope="row">
                        {nameOf(row.assigneeId)}{' '}
                        {capacity !== undefined && <span className="workload-capacity">{formatHours(capacity)} h/week</span>}
                      </th>
                      {row.hours.map((h, i) => (
                        <td key={weeks[i]} className={row.over[i] > 0 ? 'workload-cell--over' : undefined}>
                          {h > 0 ? `${h} h` : ''}
                          {row.over[i] > 0 && <span className="workload-warning"><AlertTriangle className="workload-icon" aria-hidden="true" /> over by {row.over[i]} h</span>}
                        </td>
                      ))}
                      <td>{row.total} h</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {result.unplanned > 0 && <p className="planning-date">{result.unplanned} open {result.unplanned === 1 ? 'task is' : 'tasks are'} not counted: no estimate or due date.</p>}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
