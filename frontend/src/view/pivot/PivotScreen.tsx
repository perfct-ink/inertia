import { useState } from 'react'
import { Loader2, Table2 } from 'lucide-react'
import { Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useTasks } from '@/api/tasks'
import { useWorkspaceMembers } from '@/api/workspaces'
import { PIVOT_DIMENSIONS, pivotTasks, type PivotDimension } from '@/data/pivot'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceStore } from '@/store/workspaces'
import '../planning/PlanningScreen.scss'
import './PivotScreen.scss'

// Counts tasks by one field down the side and another across the top.
export default function PivotScreen() {
  usePageTitle('Pivot')
  const { data: tasks = [], isLoading } = useTasks()
  const { data: epics = [] } = useEpics()
  const { data: sprints = [] } = useSprints()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const [rowDim, setRowDim] = useState<PivotDimension>('epic')
  const [colDim, setColDim] = useState<PivotDimension>('status')

  const table = pivotTasks(tasks, rowDim, colDim, {
    epics: new Map(epics.map((e) => [e.id, e.title])),
    sprints: new Map(sprints.map((s) => [s.id, s.title])),
    assignees: new Map(members.map((m) => [m.user_id, m.user.name])),
  })

  return (
    <WorkspaceLayout>
      <div className="view-planning view-pivot">
        <div className="planning-header">
          <h1 className="planning-title">Pivot</h1>
          <label>Rows <Select aria-label="Rows" value={rowDim} onChange={(e) => setRowDim(e.target.value as PivotDimension)}>
            {PIVOT_DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select></label>
          <label>Columns <Select aria-label="Columns" value={colDim} onChange={(e) => setColDim(e.target.value as PivotDimension)}>
            {PIVOT_DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select></label>
        </div>
        <div className="planning-body">
          {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
          {!isLoading && table.total === 0 && (
            <div className="planning-empty">
              <Table2 className="planning-empty_icon" aria-hidden="true" />
              <p>No tasks to count yet.</p>
            </div>
          )}
          {table.total > 0 && (
            <table className="pivot-table">
              <thead>
                <tr>
                  <th scope="col">{PIVOT_DIMENSIONS.find((d) => d.value === rowDim)?.label}</th>
                  {table.columns.map((c) => <th key={c.key} scope="col">{c.label}</th>)}
                  <th scope="col">Total</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r) => (
                  <tr key={r.key}>
                    <th scope="row">{r.label}</th>
                    {table.columns.map((c) => <td key={c.key}>{table.counts[r.key]?.[c.key] ?? ''}</td>)}
                    <td>{table.rowTotals[r.key]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  {table.columns.map((c) => <td key={c.key}>{table.columnTotals[c.key]}</td>)}
                  <td>{table.total}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
