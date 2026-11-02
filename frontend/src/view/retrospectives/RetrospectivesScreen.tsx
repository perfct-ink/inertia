import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Loader2, MessagesSquare, Plus } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useCreateRetrospective, useRetrospectives } from '@/api/retrospectives'
import { useSprints } from '@/api/sprints'
import {
  DEFAULT_TEMPLATE, RETRO_TEMPLATES, retroSummary, retroTemplate, retrospectivePath, suggestedTitle, type RetroTemplateKey,
} from '@/data/retrospective'
import { usePageTitle } from '@/hooks/usePageTitle'
import { todayISO } from '@/util/date'
import './RetrospectivesScreen.scss'

// Retrospective boards: pick a template (its columns), optionally a sprint,
// then open the board to add cards, vote and turn action items into tasks.
export default function RetrospectivesScreen() {
  usePageTitle('Retrospectives')
  const navigate = useNavigate()
  const { data: retrospectives = [], isLoading } = useRetrospectives()
  const { data: sprints = [] } = useSprints()
  const createRetrospective = useCreateRetrospective()
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState('')
  const [template, setTemplate] = useState<RetroTemplateKey>(DEFAULT_TEMPLATE)
  const [sprintId, setSprintId] = useState('')

  const picked = retroTemplate(template)
  const sprint = sprints.find((s) => String(s.id) === sprintId)
  const suggestion = suggestedTitle(sprint?.title, todayISO())

  function open() {
    setTitle('')
    setTemplate(DEFAULT_TEMPLATE)
    setSprintId('')
    setCreating(true)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    createRetrospective.mutate(
      { title: title.trim() || suggestion, template, sprint_id: sprint ? sprint.id : null },
      { onSuccess: (retro) => { setCreating(false); navigate(retrospectivePath(retro.id)) } },
    )
  }

  return (
    <WorkspaceLayout>
      <div className="view-retrospectives">
        <div className="retrospectives-header">
          <h1 className="retrospectives-title">Retrospectives</h1>
          <Button variant="primary" onClick={open} className="retrospectives-new">
            <Plus className="retrospectives-icon" aria-hidden="true" />
            New retrospective
          </Button>
        </div>

        <div className="retrospectives-body">
          <div className="retrospectives-list">
            {isLoading && <Loader2 className="retrospectives-icon retrospectives-icon--spin" aria-label="Loading" />}

            {!isLoading && retrospectives.length === 0 && (
              <div className="retrospectives-empty">
                <MessagesSquare className="retrospectives-empty_icon" aria-hidden="true" />
                <p>No retrospectives yet. Start one after a sprint to collect what went well, what to improve and what to do next.</p>
              </div>
            )}

            {retrospectives.map((retro) => {
              const summary = retroSummary(retro)
              const retroSprint = sprints.find((s) => s.id === retro.sprint_id)
              return (
                <Link key={retro.id} to={retrospectivePath(retro.id)} className="retrospectives-card">
                  <h2 className="retrospectives-card-title">{retro.title}</h2>
                  <p className="retrospectives-card-meta">
                    {[retroTemplate(retro.template).label, retroSprint?.title, format(parseISO(retro.created_at), 'MMM d, yyyy')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {summary && <p className="retrospectives-card-meta">{summary}</p>}
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      <Modal
        open={creating}
        title="New retrospective"
        description="The template decides the columns on the board. It can't be changed afterwards."
        onClose={() => setCreating(false)}
      >
        <form onSubmit={submit} className="ui-modal-form">
          <label className="retrospectives-field">
            <span>Title</span>
            <Input value={title} placeholder={suggestion} autoFocus onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="retrospectives-field">
            <span>Template</span>
            <Select value={template} onChange={(e) => setTemplate(e.target.value as RetroTemplateKey)}>
              {RETRO_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Select>
          </label>
          <p className="retrospectives-hint">
            {picked.description} Columns: {picked.columns.map((c) => c.label).join(', ')}.
          </p>
          <label className="retrospectives-field">
            <span>Sprint (optional)</span>
            <Select value={sprintId} onChange={(e) => setSprintId(e.target.value)}>
              <option value="">No sprint</option>
              {sprints.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </Select>
          </label>
          <div className="ui-modal-actions">
            <Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={createRetrospective.isPending}>Create board</Button>
          </div>
        </form>
      </Modal>
    </WorkspaceLayout>
  )
}
