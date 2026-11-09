import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { Button, FormError, IconButton, Input, Select } from '@/components/ui'
import SavedViews from '@/components/SavedViews'
import { Timeline, type TimelineMilestone } from '@/components/Timeline'
import { useUpdateTask } from '@/api/tasks'
import { useUpdateEpic } from '@/api/epics'
import { useUpdateFolder } from '@/api/folders'
import { useBaselines, useCreateBaseline, useDeleteBaseline } from '@/api/baselines'
import { withBaseline } from '@/data/baseline'
import { useCreateTaskDependency, useTaskDependencies } from '@/api/taskDependencies'
import { GANTT_ZOOMS, GANTT_ZOOM_LABEL, ganttTaskKey, groupGanttRows, parseGanttConfig, type GanttGroups, type GanttZoom, type Scheduled } from '@/data/schedule'
import { DEPENDENCY_MODES, DEPENDENCY_MODE_LABEL, drivingPath, kindFromSides, planReschedule, splitDependencies, type BarSide } from '@/data/dependency'
import { errorMessage } from '@/util/errorMessage'
import { exportGanttPng } from '@/util/ganttCanvas'
import { printGantt } from '@/util/printGantt'
import type { DependencyMode, Epic, Folder, Task } from '@/types'
import { DependencyEditor } from './DependencyEditor'
import './GanttPane.scss'

// The folder's Gantt tab: epics and dated tasks under the initiatives and
// milestones they belong to, dependency arrows between this folder's tasks
// (PM-13), the driving path highlighted (PM-15), and a small editor for the
// links underneath, which also lists the links to tasks in other projects.
// `milestones` are the diamonds; `groups` are the Space's initiatives and
// milestones, of which only those with an epic or task in this folder get a
// row; `folders` is the Space's folder tree, to name the other projects.
export default function GanttPane({ folderId, dependencyMode, epics, tasks, milestones, groups, folders = [], folderName = 'Gantt' }: {
  folderId: number
  dependencyMode: DependencyMode
  epics: Epic[]
  tasks: Task[]
  milestones: TimelineMilestone[]
  folderName?: string
  groups?: GanttGroups
  folders?: Folder[]
}) {
  const { data: allDependencies = [] } = useTaskDependencies()
  const [showCritical, setShowCritical] = useState(true)
  const [zoom, setZoom] = useState<GanttZoom>('month')
  const [shadeWeekends, setShadeWeekends] = useState(true)
  const qc = useQueryClient()
  const updateTask = useUpdateTask()
  const updateEpic = useUpdateEpic()
  const updateFolder = useUpdateFolder()
  const [moveError, setMoveError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const { data: baselines = [] } = useBaselines(folderId)
  const createBaseline = useCreateBaseline(folderId)
  const deleteBaseline = useDeleteBaseline(folderId)
  // '' shows no baseline; otherwise the id of the one drawn under the bars.
  const [baselineId, setBaselineId] = useState('')
  const [baselineName, setBaselineName] = useState('')
  const baseline = baselines.find((b) => String(b.id) === baselineId)

  function saveBaseline() {
    const name = baselineName.trim()
    if (!name) return
    createBaseline.mutate(name, { onSuccess: (created) => { setBaselineName(''); setBaselineId(String(created.id)) } })
  }

  // Rows are keyed `task-<id>` / `epic-<id>` (milestone and initiative rows are
  // not draggable); a task's end is due_date, an epic's is target_date.
  // Task moves go through the folder's dependency mode (PM-14), which may block
  // the move or add the tasks that have to shift with it. The server applies the
  // mode too and can refuse, so a failed save shows its message.
  function reschedule(item: Scheduled, startDate: string, endDate: string) {
    const id = Number(item.key?.split('-')[1])
    // The chart reads from the folder's contents, which the update hooks don't refresh.
    const options = {
      onSettled: () => qc.invalidateQueries({ queryKey: ['folder-contents'] }),
      onError: (error: unknown) => setMoveError(errorMessage(error)),
    }
    setMoveError(null)
    if (item.key?.startsWith('task-')) {
      const plan = planReschedule(tasks, dependencies, id, startDate, endDate, dependencyMode)
      if ('error' in plan) {
        setMoveError(plan.error)
        return
      }
      plan.updates.forEach((u) => updateTask.mutate(u, options))
    } else if (item.key?.startsWith('epic-')) {
      updateEpic.mutate({ id, start_date: startDate, target_date: endDate }, options)
    }
  }

  // Dragging between bar sides: the predecessor is where the drag began. A failed
  // create (loop, duplicate) is reported by the API client's error notice.
  const createDependency = useCreateTaskDependency()
  function linkTasks(from: { key: string; side: BarSide }, to: { key: string; side: BarSide }) {
    if (!from.key.startsWith('task-') || !to.key.startsWith('task-')) return
    const predecessorId = Number(from.key.split('-')[1])
    const successorId = Number(to.key.split('-')[1])
    if (dependencies.some((d) => d.predecessor_id === predecessorId && d.successor_id === successorId)) return
    createDependency.mutate({ predecessor_id: predecessorId, successor_id: successorId, kind: kindFromSides(from.side, to.side) })
  }

  const taskIds = useMemo(() => new Set(tasks.map((t) => t.id)), [tasks])
  // Links with both ends in this folder are drawn; links to another project's
  // task (one end here) are only listed under the chart. The rest belong to
  // other charts.
  const { internal: dependencies, external: externalDependencies } = useMemo(
    () => splitDependencies(allDependencies, taskIds),
    [allDependencies, taskIds],
  )
  const critical = useMemo(
    () => (showCritical ? drivingPath(tasks, dependencies) : new Set<number>()),
    [showCritical, tasks, dependencies],
  )
  const links = dependencies.map((d) => ({ from: ganttTaskKey(d.predecessor_id), to: ganttTaskKey(d.successor_id), kind: d.kind }))

  const rows = groupGanttRows(epics, tasks, critical, groups)

  return (
    <div className="view-gantt_pane">
      <div className="gantt_pane-toolbar">
        <Select aria-label="Zoom" value={zoom} onChange={(e) => setZoom(e.target.value as GanttZoom)} className="gantt_pane-select">
          {GANTT_ZOOMS.map((z) => <option key={z} value={z}>{GANTT_ZOOM_LABEL[z]}</option>)}
        </Select>
        <label className="gantt_pane-toggle">
          <Input type="checkbox" checked={shadeWeekends} onChange={(e) => setShadeWeekends(e.target.checked)} />
          Shade weekends
        </label>
        <label className="gantt_pane-toggle">
          <Input type="checkbox" checked={showCritical} onChange={(e) => setShowCritical(e.target.checked)} />
          Highlight critical path
        </label>
        <Select
          aria-label="When a task moves"
          value={dependencyMode}
          onChange={(e) => updateFolder.mutate(
            { id: folderId, dependency_mode: e.target.value as DependencyMode },
            { onSuccess: () => qc.invalidateQueries({ queryKey: ['folder-contents'] }) },
          )}
          className="gantt_pane-select"
        >
          {DEPENDENCY_MODES.map((m) => <option key={m} value={m}>{DEPENDENCY_MODE_LABEL[m]}</option>)}
        </Select>
        <SavedViews
          page="gantt"
          config={{ zoom, shadeWeekends, showCritical }}
          parse={parseGanttConfig}
          onApply={(view) => { setZoom(view.zoom); setShadeWeekends(view.shadeWeekends); setShowCritical(view.showCritical) }}
        />
      </div>
      <div className="gantt_pane-toolbar">
        <Button
          variant="secondary"
          onClick={() => { setExportError(null); exportGanttPng(rows, folderName).catch((e) => setExportError(errorMessage(e))) }}
        >
          Export PNG
        </Button>
        <Button variant="secondary" onClick={printGantt}>Print or save as PDF</Button>
      </div>
      <FormError message={exportError} />
      <div className="gantt_pane-toolbar">
        <Select aria-label="Baseline" value={baselineId} onChange={(e) => setBaselineId(e.target.value)} className="gantt_pane-select">
          <option value="">No baseline</option>
          {baselines.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </Select>
        {baseline && (
          <Button onClick={() => { deleteBaseline.mutate(baseline.id); setBaselineId('') }} aria-label={`Delete baseline ${baseline.name}`}>
            <X className="gantt_pane-icon" aria-hidden="true" />
          </Button>
        )}
        <Input
          aria-label="New baseline name"
          placeholder="Baseline name"
          value={baselineName}
          onChange={(e) => setBaselineName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') saveBaseline() }}
        />
        <Button variant="secondary" onClick={saveBaseline} disabled={!baselineName.trim() || createBaseline.isPending}>Save baseline</Button>
      </div>
      <FormError message={moveError} />
      <Timeline
        milestones={milestones}
        items={withBaseline(rows, baseline)}
        links={links}
        onReschedule={reschedule}
        onLink={linkTasks}
        canLink={(item) => Boolean(item.key?.startsWith('task-'))}
        zoom={zoom}
        shadeWeekends={shadeWeekends}
      />
      <DependencyEditor tasks={tasks} dependencies={dependencies} externalDependencies={externalDependencies} folders={folders} />
    </div>
  )
}
