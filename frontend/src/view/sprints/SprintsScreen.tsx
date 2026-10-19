import { useRef, useState } from 'react'
import { Plus, X, Rocket, Loader2 } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useSprints, useCreateSprint, useUpdateSprint, useDeleteSprint } from '@/api/sprints'
import { PLANNING_STATUSES } from '@/data/milestone'
import { donePercent } from '@/data/schedule'
import { Link } from 'react-router-dom'
import { sprintBoardPath } from '@/data/sprint'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { PlanningStatus } from '@/types'
import './SprintsScreen.scss'

export default function SprintsScreen() {
  usePageTitle('Sprints')
  const { data: sprints = [], isLoading } = useSprints()
  const createSprint = useCreateSprint()
  const updateSprint = useUpdateSprint()
  const deleteSprint = useDeleteSprint()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createSprint.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="view-sprints">
        <div className="sprints-header">
          <h1 className="sprints-title">Sprints</h1>
          <Button variant="primary" onClick={() => setAdding(true)} className="sprints-new">
            <Plus className="sprints-icon" />
            New sprint
          </Button>
        </div>

        <div className="sprints-body">
          <div className="sprints-list">
            {adding && (
              <Input
                autoFocus
                aria-label="Sprint title"
                placeholder="Sprint title"
                onChange={(e) => { titleRef.current = e.target.value }}
                onBlur={() => commitAdd(titleRef.current)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd(titleRef.current)
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
            )}

            {isLoading && <Loader2 className="sprints-icon sprints-icon--spin" aria-label="Loading" />}

            {!isLoading && sprints.length === 0 && !adding && (
              <div className="sprints-empty">
                <Rocket className="sprints-empty_icon" />
                <p>No sprints yet. A sprint is a time-boxed slice of work tasks can be assigned to.</p>
              </div>
            )}

            {sprints.map((sprint) => (
              <div key={sprint.id} className="sprints-card">
                <div className="sprints-card-top">
                  <h2 className="sprints-card-title">{sprint.title}</h2>
                  <Button
                    onClick={() => deleteSprint.mutate(sprint.id)}
                    aria-label={`Delete ${sprint.title}`}
                    className="sprints-card-delete"
                  >
                    <X className="sprints-icon" aria-hidden="true" />
                  </Button>
                </div>

                <Input
                  aria-label="Goal"
                  placeholder="Sprint goal…"
                  value={sprint.goal ?? ''}
                  onChange={(e) => updateSprint.mutate({ id: sprint.id, goal: e.target.value || null })}
                  className="sprints-goal"
                />

                <div className="sprints-card-fields">
                  <label className="sprints-field">
                    <span>Start</span>
                    <Input
                      type="date"
                      value={sprint.start_date ?? ''}
                      onChange={(e) => updateSprint.mutate({ id: sprint.id, start_date: e.target.value || null })}
                      className="sprints-date"
                    />
                  </label>
                  <label className="sprints-field">
                    <span>End</span>
                    <Input
                      type="date"
                      value={sprint.end_date ?? ''}
                      onChange={(e) => updateSprint.mutate({ id: sprint.id, end_date: e.target.value || null })}
                      className="sprints-date"
                    />
                  </label>
                  <label className="sprints-field">
                    <span>Status</span>
                    <Select
                      value={sprint.status}
                      onChange={(e) => updateSprint.mutate({ id: sprint.id, status: e.target.value as PlanningStatus })}
                      className="sprints-status"
                    >
                      {PLANNING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </Select>
                  </label>
                </div>

                <ProgressBar percent={donePercent(sprint)} />
                <Link to={sprintBoardPath(sprint.id)} className="sprints-board_link">Open board</Link>
                <p className="sprints-card-counts">
                  {sprint.done_tasks_count}/{sprint.tasks_count} tasks done
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
