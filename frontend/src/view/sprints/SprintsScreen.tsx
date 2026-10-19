import { useRef, useState } from 'react'
import { Plus, X, Rocket, Loader2 } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useSprints, useCreateSprint, useUpdateSprint, useDeleteSprint, useStartSprint, useCloseSprint } from '@/api/sprints'
import { carryTargets, closeSummary } from '@/data/sprint'
import { donePercent } from '@/data/schedule'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Sprint } from '@/types'
import './SprintsScreen.scss'

export default function SprintsScreen() {
  usePageTitle('Sprints')
  const { data: sprints = [], isLoading } = useSprints()
  const createSprint = useCreateSprint()
  const updateSprint = useUpdateSprint()
  const deleteSprint = useDeleteSprint()
  const startSprint = useStartSprint()
  const closeSprint = useCloseSprint()
  const [adding, setAdding] = useState(false)
  const [closing, setClosing] = useState<Sprint | null>(null)
  const [carryTo, setCarryTo] = useState('')
  const [summary, setSummary] = useState('')
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
                  <div className="sprints-field">
                    <span>Status</span>
                    <span className="sprints-status_text">{sprint.status}</span>
                    {sprint.status === 'planned' && (
                      <Button variant="secondary" onClick={() => startSprint.mutate(sprint.id)}>Start sprint</Button>
                    )}
                    {sprint.status === 'active' && (
                      <Button variant="secondary" onClick={() => { setClosing(sprint); setCarryTo('') }}>Close sprint</Button>
                    )}
                  </div>
                </div>

                <ProgressBar percent={donePercent(sprint)} />
                <p className="sprints-card-counts">
                  {sprint.done_tasks_count}/{sprint.tasks_count} tasks done
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={closing !== null}
        title={`Close ${closing?.title ?? 'sprint'}`}
        description="Tasks that aren't done move on. Done tasks stay in this sprint."
        onClose={() => setClosing(null)}
      >
        <Select aria-label="Move unfinished tasks to" value={carryTo} onChange={(e) => setCarryTo(e.target.value)}>
          <option value="">No sprint</option>
          {closing && carryTargets(sprints, closing).map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </Select>
        <div className="ui-modal-actions">
          <Button variant="secondary" onClick={() => setClosing(null)}>Cancel</Button>
          <Button
            variant="primary"
            disabled={closeSprint.isPending}
            onClick={() => closing && closeSprint.mutate(
              { id: closing.id, carryToSprintId: carryTo ? Number(carryTo) : null },
              { onSuccess: (result) => { setSummary(`${closing.title} closed: ${closeSummary(result.completed, result.carried_over)}.`); setClosing(null) } },
            )}
          >
            Close sprint
          </Button>
        </div>
      </Modal>
      {summary && <p className="sprints-summary" role="status">{summary}</p>}
    </WorkspaceLayout>
  )
}
