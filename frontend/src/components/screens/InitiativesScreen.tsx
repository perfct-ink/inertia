import { Button, Input } from '@/components/ui'
import { useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, X, Flag, Loader2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useInitiatives, useCreateInitiative, useUpdateInitiative, useDeleteInitiative } from '@/api/initiatives'
import { ProgressBar, Timeline, donePercent } from '@/components/Timeline'

export default function InitiativesScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'timeline' ? 'timeline' : 'list'
  const { data: initiatives = [], isLoading } = useInitiatives()
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
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b px-6 py-3 shrink-0 flex items-center gap-4">
          <h1 className="text-xl font-semibold">Initiatives</h1>
          <div className="flex gap-1">
            <Button
              onClick={() => navigate('/initiatives?view=list')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'list' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              List
            </Button>
            <Button
              onClick={() => navigate('/initiatives?view=timeline')}
              className={`px-3 py-1 rounded-md text-sm ${view === 'timeline' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              Timeline
            </Button>
          </div>
          <Button variant="primary"
            onClick={() => setAdding(true)}
            className="ml-auto flex items-center gap-1.5 py-1.5"
          >
            <Plus className="w-4 h-4" />
            New initiative
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto py-6 px-6 flex flex-col gap-3">
            {adding && (
              <div className="bg-card border rounded-lg p-4">
                <Input
                  autoFocus
                  placeholder="Initiative title…"
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

            {!isLoading && initiatives.length === 0 && !adding && (
              <div className="flex flex-col items-center py-12 gap-2 text-muted-foreground">
                <Flag className="w-8 h-8 opacity-30" />
                <p className="text-sm">No initiatives yet</p>
              </div>
            )}

            {!isLoading && initiatives.length > 0 && view === 'timeline' && <Timeline items={initiatives} />}

            {!isLoading && view === 'list' && initiatives.map((initiative) => (
              <div
                key={initiative.id}
                onClick={() => navigate(`/epics?initiative_id=${initiative.id}`)}
                className="bg-card border rounded-lg p-4 flex flex-col gap-2 cursor-pointer hover:border-primary group"
              >
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 text-muted-foreground shrink-0" />
                  <p className="text-sm font-medium flex-1 truncate">{initiative.title}</p>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {initiative.done_tasks_count}/{initiative.tasks_count} done
                  </span>
                  <Button
                    onClick={(e) => { e.stopPropagation(); deleteInitiative.mutate(initiative.id) }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground" onClick={(e) => e.stopPropagation()}>
                  <Input
                    type="date"
                    value={initiative.start_date ?? ''}
                    onChange={(e) => updateInitiative.mutate({ id: initiative.id, start_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                  <span>&rarr;</span>
                  <Input
                    type="date"
                    value={initiative.target_date ?? ''}
                    onChange={(e) => updateInitiative.mutate({ id: initiative.id, target_date: e.target.value || null })}
                    className="bg-transparent border-b border-input pb-0.5 outline-none cursor-pointer"
                  />
                </div>
                <ProgressBar percent={donePercent(initiative)} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
