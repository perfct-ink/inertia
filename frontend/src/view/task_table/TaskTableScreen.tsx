import { useState } from 'react'
import { ArrowDown, ArrowUp, Loader2, Table as TableIcon } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics } from '@/api/epics'
import { useSprints } from '@/api/sprints'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { useWorkspaceMembers } from '@/api/workspaces'
import { PIVOT_DIMENSIONS } from '@/data/pivot'
import { TASK_STATUSES, STATUS_LABEL } from '@/data/task'
import { TASK_COLUMNS, taskTableGroups, visibleColumns, type GroupBy, type TaskColumn } from '@/data/taskTable'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useWorkspaceStore } from '@/store/workspaces'
import type { Task } from '@/types'
import '../planning/PlanningScreen.scss'
import './TaskTableScreen.scss'

// Every task in the Space as an editable table: change the title, status, dates,
// assignee, epic or sprint in place; sort by a column, group, filter by title
// and hide columns you don't need.
export default function TaskTableScreen() {
  usePageTitle('Task table')
  const { data: tasks = [], isLoading } = useTasks()
  const { data: epics = [] } = useEpics()
  const { data: sprints = [] } = useSprints()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const updateTask = useUpdateTask()
  const [sortKey, setSortKey] = useState<TaskColumn>('due_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState<Set<TaskColumn>>(new Set())

  const lookups = {
    epics: new Map(epics.map((e) => [e.id, e.title])),
    sprints: new Map(sprints.map((s) => [s.id, s.title])),
    assignees: new Map(members.map((m) => [m.user_id, m.user.name])),
  }
  const groups = taskTableGroups(tasks, { sortKey, sortDir, groupBy, query }, lookups)
  const columns = visibleColumns(hidden)

  function sortBy(column: TaskColumn) {
    if (column === sortKey) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(column); setSortDir('asc') }
  }

  function toggleColumn(column: TaskColumn, shown: boolean) {
    setHidden((current) => { const next = new Set(current); if (shown) next.delete(column); else next.add(column); return next })
  }

  const save = (task: Task, data: Partial<Task>) => updateTask.mutate({ id: task.id, ...data })
  const idOrNull = (value: string) => (value ? Number(value) : null)

  function cell(task: Task, column: TaskColumn) {
    switch (column) {
      case 'title':
        return <Input aria-label={`Title of ${task.title}`} defaultValue={task.title} key={task.title}
          onBlur={(e) => { const title = e.target.value.trim(); if (title && title !== task.title) save(task, { title }); else e.target.value = task.title }} />
      case 'status':
        return <Select aria-label={`Status of ${task.title}`} value={task.status} onChange={(e) => save(task, { status: e.target.value as Task['status'] })}>
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </Select>
      case 'start_date':
        return <Input type="date" aria-label={`Start of ${task.title}`} value={task.start_date ?? ''} onChange={(e) => save(task, { start_date: e.target.value || null })} />
      case 'due_date':
        return <Input type="date" aria-label={`Due date of ${task.title}`} value={task.due_date ?? ''} onChange={(e) => save(task, { due_date: e.target.value || null })} />
      case 'assignee':
        return <Select aria-label={`Assignee of ${task.title}`} value={task.assignee_id ?? ''} onChange={(e) => save(task, { assignee_id: idOrNull(e.target.value) })}>
          <option value="">Unassigned</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
        </Select>
      case 'epic':
        return <Select aria-label={`Epic of ${task.title}`} value={task.epic_id ?? ''} onChange={(e) => save(task, { epic_id: idOrNull(e.target.value) })}>
          <option value="">No epic</option>
          {epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.title}</option>)}
        </Select>
      case 'sprint':
        return <Select aria-label={`Sprint of ${task.title}`} value={task.sprint_id ?? ''} onChange={(e) => save(task, { sprint_id: idOrNull(e.target.value) })}>
          <option value="">No sprint</option>
          {sprints.map((sprint) => <option key={sprint.id} value={sprint.id}>{sprint.title}</option>)}
        </Select>
    }
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-task_table">
        <div className="planning-header">
          <h1 className="planning-title">Task table</h1>
          <Input type="search" aria-label="Filter tasks" placeholder="Filter by title" value={query} onChange={(e) => setQuery(e.target.value)} />
          <label>Group by <Select aria-label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
            <option value="none">Nothing</option>
            {PIVOT_DIMENSIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select></label>
        </div>
        <fieldset className="task_table-columns">
          <legend>Columns</legend>
          {TASK_COLUMNS.map(({ key, label }) => (
            <label key={key}>
              <Input type="checkbox" checked={!hidden.has(key)} disabled={key === 'title'} onChange={(e) => toggleColumn(key, e.target.checked)} /> {label}
            </label>
          ))}
        </fieldset>
        <div className="planning-body">
          {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}
          {!isLoading && tasks.length === 0 && (
            <div className="planning-empty">
              <TableIcon className="planning-empty_icon" aria-hidden="true" />
              <p>No tasks yet.</p>
            </div>
          )}
          {groups.map((group) => group.tasks.length > 0 && (
            <section key={group.key} aria-label={group.label ?? 'Tasks'}>
              {group.label && <h2 className="task_table-group">{group.label} <span className="planning-date">{group.tasks.length}</span></h2>}
              <table className="task_table-table">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th key={column} scope="col" aria-sort={sortKey === column ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <Button variant="unstyled" onClick={() => sortBy(column)}>
                          {TASK_COLUMNS.find((c) => c.key === column)?.label}
                          {sortKey === column && (sortDir === 'asc' ? <ArrowUp className="task_table-sort" aria-hidden="true" /> : <ArrowDown className="task_table-sort" aria-hidden="true" />)}
                        </Button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.tasks.map((task) => <tr key={task.id}>{columns.map((column) => <td key={column}>{cell(task, column)}</td>)}</tr>)}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
