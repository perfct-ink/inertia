import { Button, Input, Select } from '@/components/ui'
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Target, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics, useCreateEpic, useUpdateEpic, useDeleteEpic } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import '../planning/PlanningScreen.scss'
import { ProgressBar, Timeline, donePercent } from '@/components/Timeline'
import { usePageTitle } from '@/hooks/usePageTitle'

export default function EpicsScreen() {
  usePageTitle('Epics')
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const view = searchParams.get('view') === 'timeline' ? 'timeline' : 'list'
  const initiativeIdFilter = searchParams.get('initiative_id')
  const { data: allEpics = [], isLoading } = useEpics()
  const { data: initiatives = [] } = useInitiatives()
  const epics = initiativeIdFilter ? allEpics.filter((e) => String(e.initiative_id) === initiativeIdFilter) : allEpics
  const createEpic = useCreateEpic()
  const updateEpic = useUpdateEpic()
  const deleteEpic = useDeleteEpic()
  const [adding, setAdding] = useState(false)
  const titleRef = useRef('')

  function commitAdd(value: string) {
    const title = value.trim()
    if (title) createEpic.mutate({ title })
    setAdding(false)
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
          <h1 className="planning-title">Epics</h1>
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
            New epic
          </Button>
        </div>

        <div className="planning-body">
          <div className="planning-list">
            {adding && (
              <div className="planning-new_card">
                <Input
                  autoFocus
                  placeholder="Epic title…"
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
                <p>No epics yet</p>
              </div>
            )}

            {!isLoading && epics.length > 0 && view === 'timeline' && <Timeline items={epics} />}

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
                  <Button
                    onClick={(e) => { e.stopPropagation(); deleteEpic.mutate(epic.id) }}
                    aria-label="Delete epic"
                    className="planning-card-delete"
                  >
                    <X className="planning-delete_icon" aria-hidden="true" />
                  </Button>
                </div>
                <div className="planning-card-dates" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="date"
                    value={epic.start_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, start_date: e.target.value || null })}
                    className="planning-date"
                  />
                  <span>&rarr;</span>
                  <Input
                    type="date"
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
                </div>
                <ProgressBar percent={donePercent(epic)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
