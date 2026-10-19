import { Button, Input, Select } from '@/components/ui'
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Flag, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useMilestones } from '@/api/milestones'
import { useWorkspace } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaces'
import { useInitiatives, useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '@/api/initiatives'
import '../planning/PlanningScreen.scss'
import { ProgressBar, Timeline } from '@/components/Timeline'
import { usePageTitle } from '@/hooks/usePageTitle'
import { donePercent } from '@/data/schedule'
import { PLANNING_STATUS_LABEL } from '@/data/planning'
import type { PlanningStatus } from '@/types'

export default function InitiativesScreen() {
  usePageTitle('Initiatives')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'timeline' ? 'timeline' : 'list'
  const { data: initiatives = [], isLoading } = useInitiatives()
  const { data: milestones = [] } = useMilestones()
  const { data: workspace } = useWorkspace()
  const { data: members = [] } = useWorkspaceMembers(workspace?.id ?? 0)
  const createInitiative = useCreateInitiative()
  const updateInitiative = useUpdateInitiative()
  const deleteInitiative = useDeleteInitiative()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createInitiative.mutate({ title })
    setAdding(false)
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-initiatives">
        <div className="planning-header">
          <h1 className="planning-title">Initiatives</h1>
          <div className="planning-tabs">
            <Button
              onClick={() => navigate('/initiatives?view=list')}
              className={`planning-tab${view === 'list' ? ' planning-tab--active' : ''}`}
            >
              List
            </Button>
            <Button
              onClick={() => navigate('/initiatives?view=timeline')}
              className={`planning-tab${view === 'timeline' ? ' planning-tab--active' : ''}`}
            >
              Timeline
            </Button>
          </div>
          <Button variant="primary"
            onClick={() => setAdding(true)}
            className="planning-new"
          >
            <Plus className="planning-icon" />
            New initiative
          </Button>
        </div>

        <div className="planning-body">
          <div className="planning-list">
            {adding && (
              <div className="planning-new_card">
                <Input
                  autoFocus
                  placeholder="Initiative title…"
                  className="planning-new_input"
                  onChange={(e) => { titleRef.current = e.target.value }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitAdd(titleRef.current)
                    if (e.key === 'Escape') setAdding(false)
                  }}
                  onBlur={(e) => commitAdd(e.currentTarget.value)}
                />
              </div>
            )}

            {isLoading && (
              <div className="planning-loading">
                <Loader2 className="planning-spinner" />
              </div>
            )}

            {!isLoading && initiatives.length === 0 && !adding && (
              <div className="planning-empty">
                <Flag className="planning-empty_icon" />
                <p>No initiatives yet</p>
              </div>
            )}

            {!isLoading && initiatives.length > 0 && view === 'timeline' && <Timeline items={initiatives} />}

            {!isLoading && view === 'list' && initiatives.map((initiative) => (
              <div
                key={initiative.id}
                onClick={() => navigate(`/epics?initiative_id=${initiative.id}`)}
                className="planning-card"
              >
                <div className="planning-card-row">
                  <Flag className="planning-card-icon" />
                  <p className="planning-card-title">{initiative.title}</p>
                  <span className="planning-card-count">
                    {initiative.done_tasks_count}/{initiative.tasks_count} done
                  </span>
                  <Button
                    onClick={(e) => { e.stopPropagation(); deleteInitiative.mutate(initiative.id) }}
                    aria-label="Delete initiative"
                    className="planning-card-delete"
                  >
                    <X className="planning-delete_icon" aria-hidden="true" />
                  </Button>
                </div>
                <div className="planning-card-dates" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="date"
                    value={initiative.start_date ?? ''}
                    onChange={(e) => updateInitiative.mutate({ id: initiative.id, start_date: e.target.value || null })}
                    className="planning-date"
                  />
                  <span>&rarr;</span>
                  <Input
                    type="date"
                    value={initiative.target_date ?? ''}
                    onChange={(e) => updateInitiative.mutate({ id: initiative.id, target_date: e.target.value || null })}
                    className="planning-date"
                  />
                  <Select
                    aria-label="Status"
                    value={initiative.status}
                    onChange={(e) => updateInitiative.mutate({ id: initiative.id, status: e.target.value as PlanningStatus })}
                    className="planning-initiative"
                  >
                    {Object.entries(PLANNING_STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                  {members.length > 0 && (
                    <Select
                      aria-label="Owner"
                      value={initiative.owner_id ?? ''}
                      onChange={(e) => updateInitiative.mutate({ id: initiative.id, owner_id: e.target.value ? Number(e.target.value) : null })}
                      className="planning-initiative"
                    >
                      <option value="">No owner</option>
                      {members.map((member) => (
                        <option key={member.user_id} value={member.user_id}>{member.user.name}</option>
                      ))}
                    </Select>
                  )}
                  {milestones.length > 0 && (
                    <Select
                      aria-label="Milestone"
                      value={initiative.milestone_id ?? ''}
                      onChange={(e) => updateInitiative.mutate({ id: initiative.id, milestone_id: e.target.value ? Number(e.target.value) : null })}
                      className="planning-initiative"
                    >
                      <option value="">No milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                      ))}
                    </Select>
                  )}
                </div>
                <Input
                  aria-label="Description"
                  placeholder="Add a description…"
                  defaultValue={initiative.description ?? ''}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={(e) => {
                    const description = e.target.value.trim() || null
                    if (description !== initiative.description) updateInitiative.mutate({ id: initiative.id, description })
                  }}
                  className="planning-description"
                />
                <ProgressBar percent={donePercent(initiative)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
