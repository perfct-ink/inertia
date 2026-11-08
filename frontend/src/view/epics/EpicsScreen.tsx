import { Button, ConfirmDialog, FormError, Input, Select, DatePicker } from '@/components/ui'
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Target, Loader2, ListChecks, FileText } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics, useUpdateEpic, useDeleteEpic } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import { useMilestones } from '@/api/milestones'
import '../planning/PlanningScreen.scss'
import { ProgressBar } from '@/components/Timeline'
import PlanningTimeline from '@/components/PlanningTimeline'
import { usePageTitle } from '@/hooks/usePageTitle'
import { donePercent } from '@/data/schedule'
import { useNewFeature } from '@/hooks/useNewFeature'
import { errorMessage } from '@/util/errorMessage'
import type { Epic } from '@/types'

export default function EpicsScreen() {
  usePageTitle('Features')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'timeline' ? 'timeline' : 'list'
  const initiativeIdFilter = searchParams.get('initiative_id')
  const { data: allEpics = [], isLoading } = useEpics()
  const { data: initiatives = [] } = useInitiatives()
  const { data: milestones = [] } = useMilestones()
  const epics = initiativeIdFilter ? allEpics.filter((e) => String(e.initiative_id) === initiativeIdFilter) : allEpics
  // A feature is an epic with a requirements document: making one opens the document.
  const newFeature = useNewFeature()
  const updateEpic = useUpdateEpic()
  const deleteEpic = useDeleteEpic()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Epic | null>(null)
  const [error, setError] = useState('')
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    setAdding(false)
    if (!title) return
    setError('')
    newFeature(title).catch((e) => setError(errorMessage(e)))
  }

  function setView(next: 'list' | 'timeline') {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('view', next)
      return params
    })
  }

  function clearInitiativeFilter() {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.delete('initiative_id')
      return params
    })
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-epics">
        <div className="planning-header">
          <h1 className="planning-title">Features</h1>
          <div className="planning-tabs">
            <Button
              onClick={() => setView('list')}
              className={`planning-tab${view === 'list' ? ' planning-tab--active' : ''}`}
            >
              List
            </Button>
            <Button
              onClick={() => setView('timeline')}
              className={`planning-tab${view === 'timeline' ? ' planning-tab--active' : ''}`}
            >
              Timeline
            </Button>
          </div>
          {initiativeIdFilter && (
            <Button onClick={clearInitiativeFilter} className="planning-clear_filter">
              Clear initiative filter
            </Button>
          )}
          <Button variant="primary"
            onClick={() => setAdding(true)}
            className="planning-new"
          >
            <Plus className="planning-icon" />
            New feature
          </Button>
        </div>

        <div className="planning-body">
          <div className="planning-list">
            <FormError message={error} />
            {adding && (
              <div className="planning-new_card">
                <Input
                  autoFocus
                  aria-label="Feature name"
                  placeholder="Feature name…"
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

            {!isLoading && epics.length === 0 && !adding && (
              <div className="planning-empty">
                <Target className="planning-empty_icon" />
                <p>No features yet</p>
              </div>
            )}

            {!isLoading && epics.length > 0 && view === 'timeline' && <PlanningTimeline epics={epics} />}

            {!isLoading && view === 'list' && epics.map((epic) => (
              <div
                key={epic.id}
                onClick={() => navigate(`/tasks?epic_id=${epic.id}`)}
                className="planning-card"
              >
                <div className="planning-card-row">
                  <Target className="planning-card-icon" />
                  <p className="planning-card-title">{epic.title}</p>
                  <span className="planning-card-count">
                    {epic.done_tasks_count}/{epic.tasks_count} done
                  </span>
                  {epic.document_id && (
                    <Button
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); navigate(`/documents/${epic.document_id}`) }}
                      aria-label={`Requirements of ${epic.title}`}
                      className="planning-card-plan"
                    >
                      <FileText className="planning-delete_icon" aria-hidden="true" />
                      Requirements
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); navigate(`/plan?epic_id=${epic.id}`) }}
                    aria-label={`Plan ${epic.title}`}
                    className="planning-card-plan"
                  >
                    <ListChecks className="planning-delete_icon" aria-hidden="true" />
                    Plan
                  </Button>
                  <Button
                    onClick={(e) => { e.stopPropagation(); setDeleting(epic) }}
                    aria-label={`Delete ${epic.title}`}
                    className="planning-card-delete"
                  >
                    <X className="planning-delete_icon" aria-hidden="true" />
                  </Button>
                </div>
                <div className="planning-card-dates" onClick={(e) => e.stopPropagation()}>
                  <DatePicker
                    value={epic.start_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, start_date: e.target.value || null })}
                    className="planning-date"
                  />
                  <span>&rarr;</span>
                  <DatePicker
                    value={epic.target_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, target_date: e.target.value || null })}
                    className="planning-date"
                  />
                  {initiatives.length > 0 && (
                    <Select
                      value={epic.initiative_id ?? ''}
                      onChange={(e) => updateEpic.mutate({ id: epic.id, initiative_id: e.target.value ? Number(e.target.value) : null })}
                      className="planning-initiative"
                    >
                      <option value="">No initiative</option>
                      {initiatives.map((initiative) => (
                        <option key={initiative.id} value={initiative.id}>{initiative.title}</option>
                      ))}
                    </Select>
                  )}
                  {milestones.length > 0 && (
                    <Select
                      aria-label="Milestone"
                      value={epic.milestone_id ?? ''}
                      onChange={(e) => updateEpic.mutate({ id: epic.id, milestone_id: e.target.value ? Number(e.target.value) : null })}
                      className="planning-initiative"
                    >
                      <option value="">No milestone</option>
                      {milestones.map((milestone) => (
                        <option key={milestone.id} value={milestone.id}>{milestone.title}</option>
                      ))}
                    </Select>
                  )}
                </div>
                <ProgressBar percent={donePercent(epic)} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.title ?? 'this feature'}?`}
        description="Its requirements document and the tasks written in it are deleted too. Tasks that were only assigned to it are kept."
        confirmLabel="Delete feature"
        destructive
        onConfirm={() => deleting && deleteEpic.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </WorkspaceLayout>
  )
}
