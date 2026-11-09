import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Loader2, Plus, X } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useCreateTaskForm, useDeleteTaskForm, useTaskForms } from '@/api/taskForms'
import { useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { formStatusLabel } from '@/data/taskForm'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import type { TaskForm } from '@/types/taskForm'
import '../planning/PlanningScreen.scss'
import './FormsScreen.scss'

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

// The Space's forms: each asks a few questions and turns the answers into a
// task. Members fill them in; people who can write also build them.
export default function FormsScreen() {
  usePageTitle('Forms')
  const navigate = useNavigate()
  const { data: forms = [], isLoading } = useTaskForms()
  const { data: workspace } = useWorkspace()
  const canWrite = canWriteWorkspace(workspace?.role)
  const createForm = useCreateTaskForm()
  const deleteForm = useDeleteTaskForm()
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [deleting, setDeleting] = useState<TaskForm | null>(null)

  function create(event: FormEvent) {
    event.preventDefault()
    const value = title.trim()
    if (!value) return
    createForm.mutate({ title: value }, {
      onSuccess: (form) => { setAdding(false); setTitle(''); navigate(`/forms/${form.id}/edit`) },
    })
  }

  return (
    <WorkspaceLayout>
      <div className="view-planning view-forms">
        <div className="planning-header">
          <h1 className="planning-title">Forms</h1>
          {canWrite && (
            <Button variant="primary" onClick={() => setAdding(true)} className="planning-new">
              <Plus className="planning-icon" aria-hidden="true" />
              New form
            </Button>
          )}
        </div>

        <div className="planning-body">
          <div className="planning-list">
            {adding && (
              <form className="planning-new_card forms-new" onSubmit={create} aria-label="New form">
                <Input
                  autoFocus
                  aria-label="Form title"
                  placeholder="Form title, e.g. Report a bug"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') setAdding(false) }}
                />
                <div className="forms-new-actions">
                  <Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
                  <Button type="submit" variant="primary" disabled={!title.trim() || createForm.isPending}>Create form</Button>
                </div>
                <FormError message={createForm.isError ? errorMessage(createForm.error) : null} />
              </form>
            )}

            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}

            {!isLoading && forms.length === 0 && !adding && (
              <div className="planning-empty">
                <ClipboardList className="planning-empty_icon" aria-hidden="true" />
                <p>
                  No forms yet.
                  {canWrite && ' A form asks a few questions and turns each answer into a task.'}
                </p>
              </div>
            )}

            {forms.map((form) => (
              <article key={form.id} className="forms-card" aria-labelledby={`form-${form.id}`}>
                <div className="forms-card-top">
                  <h2 id={`form-${form.id}`} className="forms-card-title">{form.title}</h2>
                  <span className={`forms-status${form.enabled ? '' : ' forms-status--closed'}`}>{formStatusLabel(form)}</span>
                  {canWrite && (
                    <Button onClick={() => setDeleting(form)} aria-label={`Delete ${form.title}`} className="forms-delete">
                      <X className="planning-delete_icon" aria-hidden="true" />
                    </Button>
                  )}
                </div>
                {form.description && <p className="forms-card-description">{form.description}</p>}
                <p className="forms-card-meta">
                  {plural(form.questions.length, 'question')} · {plural(form.submissions_count, 'response')}
                </p>
                <div className="forms-card-actions">
                  {form.enabled && canWrite && (
                    <Button variant="primary" onClick={() => navigate(`/forms/${form.id}`)}>Fill in</Button>
                  )}
                  {canWrite && (
                    <Button variant="secondary" onClick={() => navigate(`/forms/${form.id}/edit`)}>Edit and responses</Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleting != null}
        title="Delete form"
        description={deleting ? `"${deleting.title}" and its list of responses will be removed. The tasks it created stay.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && deleteForm.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </WorkspaceLayout>
  )
}
