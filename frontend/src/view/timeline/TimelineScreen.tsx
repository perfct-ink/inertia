import { useState } from 'react'
import { GanttChart, Loader2 } from 'lucide-react'
import { Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { Timeline } from '@/components/Timeline'
import { useEpics } from '@/api/epics'
import { useTasks } from '@/api/tasks'
import { flatTaskRows, groupGanttRows } from '@/data/schedule'
import { usePageTitle } from '@/hooks/usePageTitle'
import '../planning/PlanningScreen.scss'

type Grouping = 'none' | 'epic'

// A simple timeline of the Space's tasks: a bar from start to due date for each,
// with no dependency arrows and no dragging (the folder Gantt has those).
export default function TimelineScreen() {
  usePageTitle('Timeline')
  const { data: tasks = [], isLoading } = useTasks()
  const { data: epics = [] } = useEpics()
  const [grouping, setGrouping] = useState<Grouping>('none')
  const rows = grouping === 'epic' ? groupGanttRows(epics, tasks) : flatTaskRows(tasks)
  const undated = tasks.filter((t) => !t.due_date).length

  return (
    <WorkspaceLayout>
      <div className="view-planning view-timeline_tasks">
        <div className="planning-header">
          <h1 className="planning-title">Timeline</h1>
          <Select aria-label="Group by" value={grouping} onChange={(e) => setGrouping(e.target.value as Grouping)}>
            <option value="none">No grouping</option>
            <option value="epic">Group by epic</option>
          </Select>
        </div>
        <div className="planning-body">
          {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
          {!isLoading && rows.length === 0 && (
            <div className="planning-empty">
              <GanttChart className="planning-empty_icon" aria-hidden="true" />
              <p>No tasks with dates yet. Give a task a due date (and a start date) to see it here.</p>
            </div>
          )}
          {!isLoading && rows.length > 0 && <Timeline items={rows} />}
          {undated > 0 && <p className="planning-date">{undated} {undated === 1 ? 'task has' : 'tasks have'} no due date and {undated === 1 ? 'is' : 'are'} not shown.</p>}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
