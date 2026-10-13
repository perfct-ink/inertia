import { Button, Input, Select } from '@/components/ui'
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Target, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics, useCreateEpic, useUpdateEpic, useDeleteEpic } from '@/api/epics'
import { useInitiatives } from '@/api/initiatives'
import { ProgressBar, Timeline, donePercent } from '@/components/Timeline'

export default function EpicsScreen() {
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Epics</h1>
          <div className="flex gap-1">
            <Button
              onClick={() => setView('list')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              List
            </Button>
            <Button
              onClick={() => setView('timeline')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'timeline' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Timeline
            </Button>
          </div>
          {initiativeIdFilter && (
            <Button onClick={clearInitiativeFilter} className="text-xs text-muted-foreground hover:text-foreground underline">
              Clear initiative filter
            </Button>
          )}
          <Button variant="primary"
            onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1.5 py-1.5"
          >
            <Plus className="w-4 h-4" />
            New epic
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-6 px-6 flex flex-col gap-3">
            {adding && (
              <div className="bg-card border rounded-lg p-4">
                <Input
                  autoFocus
                  placeholder="Epic title…"
                  className="w-full text-sm outline-none bg-transparent border-b border-input pb-1"
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
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}

            {!isLoading && epics.length === 0 && !adding && (
              <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                <Target className="w-8 h-8 opacity-30" />
                <p className="text-sm">No epics yet</p>
              </div>
            )}

            {!isLoading && epics.length > 0 && view === 'timeline' && <Timeline items={epics} />}

            {!isLoading && view === 'list' && epics.map((epic) => (
              <div
                key={epic.id}
                onClick={() => navigate(`/tasks?epic_id=${epic.id}`)}
                className="bg-card border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary group"
              >
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium flex-1 truncate">{epic.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {epic.done_tasks_count}/{epic.tasks_count} done
                  </span>
                  <Button
                    onClick={(e) => { e.stopPropagation(); deleteEpic.mutate(epic.id) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="date"
                    value={epic.start_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, start_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                  <span>&rarr;</span>
                  <Input
                    type="date"
                    value={epic.target_date ?? ''}
                    onChange={(e) => updateEpic.mutate({ id: epic.id, target_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                  {initiatives.length > 0 && (
                    <Select
                      value={epic.initiative_id ?? ''}
                      onChange={(e) => updateEpic.mutate({ id: epic.id, initiative_id: e.target.value ? Number(e.target.value) : null })}
                      className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer max-w-[130px]"
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
