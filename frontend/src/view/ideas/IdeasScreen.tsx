import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Lightbulb, Loader2, X } from 'lucide-react'
import { Button, Input, Textarea } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useCreateIdea, useDeleteIdea, useIdeas, usePromoteIdea, useUpdateIdea } from '@/api/ideas'
import { IDEA_STATUS_LABEL, promotedPath, sortIdeas } from '@/data/idea'
import { usePageTitle } from '@/hooks/usePageTitle'
import '../planning/PlanningScreen.scss'

// Idea / feature-request intake: anyone in the Space submits an idea; a person
// promotes it to an epic or initiative (once) or declines it.
export default function IdeasScreen() {
  usePageTitle('Ideas')
  const { data: ideas = [], isLoading } = useIdeas()
  const createIdea = useCreateIdea()
  const updateIdea = useUpdateIdea()
  const deleteIdea = useDeleteIdea()
  const promote = usePromoteIdea()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  function submit() {
    const value = title.trim()
    if (!value) return
    createIdea.mutate({ title: value, description: description.trim() || undefined }, {
      onSuccess: () => { setTitle(''); setDescription('') },
    })
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-ideas">
        <div className="planning-header">
          <h1 className="planning-title">Ideas</h1>
        </div>
        <div className="planning-body">
          <div className="planning-list">
            <div className="planning-new_card">
              <Input aria-label="Idea" placeholder="An idea or feature request" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea aria-label="Details" placeholder="Details (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              <Button variant="primary" onClick={submit} disabled={!title.trim() || createIdea.isPending}>Submit idea</Button>
            </div>

            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}

            {!isLoading && ideas.length === 0 && (
              <div className="planning-empty">
                <Lightbulb className="planning-empty_icon" aria-hidden="true" />
                <p>No ideas yet. Capture ideas here, then promote the good ones to an epic or initiative.</p>
              </div>
            )}

            {sortIdeas(ideas).map((idea) => (
              <article key={idea.id} className="planning-card" aria-label={idea.title}>
                <div className="planning-card-top">
                  <h2 className="planning-card-title">{idea.title}</h2>
                  <span className="planning-date">{IDEA_STATUS_LABEL[idea.status]}</span>
                  <Button className="planning-card-delete" aria-label={`Delete ${idea.title}`} onClick={() => deleteIdea.mutate(idea.id)}>
                    <X className="planning-delete_icon" aria-hidden="true" />
                  </Button>
                </div>
                {idea.description && <p className="planning-description">{idea.description}</p>}
                {idea.submitted_by_name && <p className="planning-date">From {idea.submitted_by_name}</p>}
                {idea.status === 'open' && (
                  <div className="planning-card-dates">
                    <Button variant="secondary" onClick={() => promote.mutate({ id: idea.id, to: 'epic' })} disabled={promote.isPending}>Promote to epic</Button>
                    <Button variant="secondary" onClick={() => promote.mutate({ id: idea.id, to: 'initiative' })} disabled={promote.isPending}>Promote to initiative</Button>
                    <Button onClick={() => updateIdea.mutate({ id: idea.id, status: 'declined' })}>Decline</Button>
                  </div>
                )}
                {idea.status === 'declined' && <Button onClick={() => updateIdea.mutate({ id: idea.id, status: 'open' })}>Reopen</Button>}
                {promotedPath(idea) && <Link to={promotedPath(idea) as string} className="planning-initiative">See it under {idea.promoted_type === 'Initiative' ? 'Initiatives' : 'Epics'}</Link>}
              </article>
            ))}
          </div>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
