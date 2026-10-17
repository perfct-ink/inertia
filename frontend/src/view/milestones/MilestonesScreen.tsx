import { useRef, useState } from 'react'
import { Plus, X, Milestone as MilestoneIcon, Loader2 } from 'lucide-react'
import { Button, HealthBadge, Input, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { useMilestones, useCreateMilestone, useUpdateMilestone, useDeleteMilestone } from '@/api/milestones'
import { PLANNING_STATUSES } from '@/data/milestone'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { PlanningStatus } from '@/types'
import './MilestonesScreen.scss'

export default function MilestonesScreen() {
  usePageTitle('Milestones')
  const { data: milestones = [], isLoading } = useMilestones()
  const createMilestone = useCreateMilestone()
  const updateMilestone = useUpdateMilestone()
  const deleteMilestone = useDeleteMilestone()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createMilestone.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="view-milestones">
        <div className="milestones-header">
          <h1 className="milestones-title">Milestones</h1>
          <Button variant="primary" onClick={() => setAdding(true)} className="milestones-new">
            <Plus className="milestones-icon" />
            New milestone
          </Button>
        </div>

        <div className="milestones-body">
          <div className="milestones-list">
            {adding && (
              <Input
                autoFocus
                aria-label="Milestone title"
                placeholder="Milestone title"
                onChange={(e) => { titleRef.current = e.target.value }}
                onBlur={() => commitAdd(titleRef.current)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitAdd(titleRef.current)
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
            )}

            {isLoading && <Loader2 className="milestones-icon milestones-icon--spin" aria-label="Loading" />}

            {!isLoading && milestones.length === 0 && !adding && (
              <div className="milestones-empty">
                <MilestoneIcon className="milestones-empty_icon" />
                <p>No milestones yet. A milestone is a target date that initiatives, epics and tasks roll up to.</p>
              </div>
            )}

            {milestones.map((milestone) => (
              <div key={milestone.id} className="milestones-card">
                <div className="milestones-card-top">
                  <h2 className="milestones-card-title">{milestone.title}</h2>
                  <HealthBadge health={milestone.health} />
                  <Button
                    onClick={() => deleteMilestone.mutate(milestone.id)}
                    aria-label={`Delete ${milestone.title}`}
                    className="milestones-card-delete"
                  >
                    <X className="milestones-icon" aria-hidden="true" />
                  </Button>
                </div>

                <div className="milestones-card-fields">
                  <label className="milestones-field">
                    <span>Target date</span>
                    <Input
                      type="date"
                      value={milestone.target_date ?? ''}
                      onChange={(e) => updateMilestone.mutate({ id: milestone.id, target_date: e.target.value || null })}
                      className="milestones-date"
                    />
                  </label>
                  <label className="milestones-field">
                    <span>Status</span>
                    <Select
                      value={milestone.status}
                      onChange={(e) => updateMilestone.mutate({ id: milestone.id, status: e.target.value as PlanningStatus })}
                      className="milestones-status"
                    >
                      {PLANNING_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </Select>
                  </label>
                </div>

                <ProgressBar percent={milestone.percent} />
                <p className="milestones-card-counts">
                  {milestone.done_tasks_count}/{milestone.tasks_count} tasks done · {milestone.epics_count} epics · {milestone.initiatives_count} initiatives
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
