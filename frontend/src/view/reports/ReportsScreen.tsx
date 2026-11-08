import { useSearchParams } from 'react-router-dom'
import { Gauge, Loader2 } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useSprints } from '@/api/sprints'
import { useTasks } from '@/api/tasks'
import { useTaskStatusEvents } from '@/api/taskStatusEvents'
import { useBoardStatuses } from '@/hooks/useBoardStatuses'
import { usePageTitle } from '@/hooks/usePageTitle'
import {
  burndown, cumulativeFlow, dayKey, defaultReportSprint, FLOW_RANGES, flowTasks, flowWindow, plannedVsUnplanned, readReportParams, REPORT_KINDS, REPORT_MEASURES,
  reportSprints, unestimatedCount, velocity, workLabel, type ReportKind,
} from '@/data/report'
import { BurndownChart, FlowChart, ScopeChart, VelocityChart } from './ReportCharts'
import '../planning/PlanningScreen.scss'
import './ReportsScreen.scss'

const EMPTY: Record<ReportKind, string> = {
  burndown: 'Start a sprint with a start and end date to see its burndown. Sprints are on the Sprints page.',
  velocity: 'No sprint has started yet, so there is no velocity. Start a sprint to see what each one gets done.',
  flow: 'There are no tasks yet to show.',
  scope: 'No sprint has started yet. Start a sprint to see how much work was added after it began.',
}

// Agile reports from the Space's sprints, tasks and status history (or the open
// project's): burndown, velocity, cumulative flow and planned vs. unplanned.
// The choices (report, measure, sprint, range) live in the address, so a report
// can be linked to. The maths is in data/report.ts and the drawing in ReportCharts.
export default function ReportsScreen() {
  usePageTitle('Reports')
  const [searchParams, setSearchParams] = useSearchParams()
  const { kind, measure, sprintId, range } = readReportParams(searchParams)
  const tasksQuery = useTasks()
  const sprintsQuery = useSprints()
  const changesQuery = useTaskStatusEvents()
  const { statuses } = useBoardStatuses()
  const tasks = tasksQuery.data ?? []
  const sprints = sprintsQuery.data ?? []
  const changes = changesQuery.data ?? []
  const loading = tasksQuery.isLoading || sprintsQuery.isLoading || changesQuery.isLoading
  const failed = tasksQuery.isError || sprintsQuery.isError || changesQuery.isError

  const today = dayKey(new Date())
  const started = reportSprints(sprints, sprints.length).reverse()
  const chosen = started.find((sprint) => sprint.id === sprintId)
  // The burndown always has a sprint (the chosen one, else the current); the flow chart has one only when chosen.
  const burndownSprint = chosen ?? defaultReportSprint(sprints)

  function choose(key: string, value: string | number | null) {
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value === null || value === '') next.delete(key)
      else next.set(key, String(value))
      return next
    })
  }

  function body() {
    if (kind === 'burndown') {
      const data = burndownSprint ? burndown(burndownSprint, tasks, changes, measure, today) : null
      if (!burndownSprint) return <Empty kind={kind} />
      if (!data) return <Empty text={`${burndownSprint.title} has no start and end dates, so there is nothing to burn down. Give it dates on the Sprints page.`} />
      return (
        <>
          <BurndownChart data={data} title={burndownSprint.title} measure={measure} />
          <Unestimated count={data.unestimated} measure={measure} />
        </>
      )
    }
    if (kind === 'velocity') {
      const data = velocity(sprints, tasks, measure)
      if (data.bars.length === 0) return <Empty kind={kind} />
      return (
        <>
          <VelocityChart data={data} measure={measure} />
          <Unestimated count={unestimatedCount(tasks.filter((task) => data.bars.some((bar) => bar.sprintId === task.sprint_id)))} measure={measure} />
        </>
      )
    }
    if (kind === 'flow') {
      const scoped = flowTasks(tasks, chosen?.id ?? null)
      if (scoped.length === 0) return <Empty kind={kind} />
      const window = flowWindow(today, range, chosen)
      const days = cumulativeFlow(scoped, changes, window.from, window.to, measure, today)
      return (
        <>
          <FlowChart days={days} statuses={statuses} measure={measure} />
          <Unestimated count={unestimatedCount(scoped)} measure={measure} />
        </>
      )
    }
    const rows = plannedVsUnplanned(sprints, tasks, measure)
    if (rows.length === 0) return <Empty kind={kind} />
    return (
      <>
        <ScopeChart rows={rows} measure={measure} />
        <Unestimated count={unestimatedCount(tasks.filter((task) => rows.some((row) => row.sprintId === task.sprint_id)))} measure={measure} />
      </>
    )
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-reports">
        <div className="planning-header">
          <h1 className="planning-title">Reports</h1>
          <div className="planning-tabs reports-tabs">
            {REPORT_KINDS.map((option) => (
              <Button
                key={option.value}
                aria-pressed={kind === option.value}
                onClick={() => choose('report', option.value === 'burndown' ? null : option.value)}
                className={`planning-tab${kind === option.value ? ' planning-tab--active' : ''}`}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="planning-body">
          <div className="reports-body">
            <div className="reports-controls">
              <label className="reports-control">
                Count
                <Select aria-label="Count" value={measure} onChange={(e) => choose('measure', e.target.value === 'points' ? null : e.target.value)}>
                  {REPORT_MEASURES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </label>
              {(kind === 'burndown' || kind === 'flow') && (
                <label className="reports-control">
                  Sprint
                  <Select aria-label="Sprint" value={kind === 'burndown' ? burndownSprint?.id ?? '' : chosen?.id ?? ''} onChange={(e) => choose('sprint', e.target.value)}>
                    {kind === 'flow' && <option value="">All work</option>}
                    {started.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.title}</option>)}
                  </Select>
                </label>
              )}
              {kind === 'flow' && !chosen && (
                <label className="reports-control">
                  Period
                  <Select aria-label="Period" value={range} onChange={(e) => choose('range', e.target.value)}>
                    {FLOW_RANGES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </label>
              )}
            </div>
            {loading && <Loader2 className="planning-spinner" aria-label="Loading" />}
            {!loading && failed && <p role="alert" className="reports-note">Couldn&apos;t load the report data.</p>}
            {!loading && !failed && body()}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function Empty({ kind, text }: { kind?: ReportKind; text?: string }) {
  return (
    <div className="planning-empty">
      <Gauge className="planning-empty_icon" aria-hidden="true" />
      <p>{text ?? (kind ? EMPTY[kind] : '')}</p>
    </div>
  )
}

// Tasks with no story points count as 0 in a points report, which makes the chart read low.
function Unestimated({ count, measure }: { count: number; measure: 'points' | 'tasks' }) {
  if (measure !== 'points' || count === 0) return null
  return (
    <p className="reports-note">
      {workLabel(count, 'tasks')} {count === 1 ? 'has no story points and counts' : 'have no story points and count'} as 0. Give {count === 1 ? 'it points' : 'them points'}, or count tasks instead.
    </p>
  )
}
