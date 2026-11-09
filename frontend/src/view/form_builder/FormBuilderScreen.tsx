import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Loader2, Plus } from 'lucide-react'
import { Button, FormError, Input, Select, Textarea } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useEpics } from '@/api/epics'
import { useTaskFormSubmissions, useTaskForms, useUpdateTaskForm } from '@/api/taskForms'
import { useWorkspace } from '@/api/workspace'
import { canManageWorkspace, canWriteWorkspace } from '@/api/workspaces'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { flattenFolders } from '@/data/folder'
import {
  MAX_QUESTIONS, PUBLIC_HOURLY_LIMIT, draftFromForm, formInput, moveQuestion, newQuestion, publicFormUrl, takenTargets, type TaskFormDraft,
} from '@/data/taskForm'
import { DEFAULT_STATUS_LABEL, TASK_STATUSES } from '@/data/task_status'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import type { TaskStatus, Workspace } from '@/types'
import type { TaskForm, TaskFormQuestion } from '@/types/taskForm'
import QuestionEditor from './QuestionEditor'
import './FormBuilderScreen.scss'

// Build one form: its settings (where the tasks go, who may fill it in), its
// questions, and the responses so far. Only people who can write open it.
export default function FormBuilderScreen() {
  const id = Number(useParams().id)
  const { data: forms = [], isLoading } = useTaskForms()
  const { data: workspace } = useWorkspace()
  const form = forms.find((f) => f.id === id)
  usePageTitle(form ? `Edit ${form.title}` : 'Edit form')

  return (
    <WorkspaceLayout>
      <div className="view-form_builder">
        {isLoading && <Loader2 className="form_builder-spinner" aria-label="Loading" />}
        {!isLoading && !form && <p className="form_builder-message" role="alert">This form doesn&rsquo;t exist, or it was deleted.</p>}
        {form && workspace && !canWriteWorkspace(workspace.role) && (
          <p className="form_builder-message" role="status">You have view-only access to this Space, so you can&rsquo;t edit forms.</p>
        )}
        {form && workspace && canWriteWorkspace(workspace.role) && <FormBuilder key={form.id} form={form} workspace={workspace} />}
      </div>
    </WorkspaceLayout>
  )
}

function FormBuilder({ form, workspace }: { form: TaskForm; workspace: Workspace }) {
  const navigate = useNavigate()
  const updateForm = useUpdateTaskForm()
  const { data: epics = [] } = useEpics()
  const { data: members = [] } = useWorkspaceMembers(workspace.id)
  const [draft, setDraft] = useState<TaskFormDraft>(() => draftFromForm(form))
  const [saved, setSaved] = useState(false)
  const canManage = canManageWorkspace(workspace.role)
  const folders = flattenFolders(workspace.folders).filter((f) => !f.archived && !f.root)

  const change = (patch: Partial<TaskFormDraft>) => { setSaved(false); setDraft((current) => ({ ...current, ...patch })) }
  const changeQuestions = (questions: TaskFormQuestion[]) => change({ questions })

  function save(event: FormEvent) {
    event.preventDefault()
    updateForm.mutate({ id: form.id, ...formInput(draft, form) }, { onSuccess: () => setSaved(true) })
  }

  return (
    <>
      <div className="form_builder-header">
        <Link to="/forms" className="form_builder-back">&larr; All forms</Link>
        <h1 className="form_builder-title">Edit form</h1>
        {form.enabled && <Button variant="secondary" onClick={() => navigate(`/forms/${form.id}`)}>Fill in</Button>}
      </div>

      <div className="form_builder-body">
        <form className="form_builder-sections" onSubmit={save} noValidate aria-label="Form settings and questions">
          <section className="form_builder-section" aria-labelledby="form_builder-settings">
            <h2 id="form_builder-settings" className="form_builder-heading">Settings</h2>
            <label className="form_builder-field">
              <span>Title</span>
              <Input value={draft.title} aria-required="true" onChange={(e) => change({ title: e.target.value })} />
            </label>
            <label className="form_builder-field">
              <span>Description (shown above the questions)</span>
              <Textarea rows={2} value={draft.description} onChange={(e) => change({ description: e.target.value })} />
            </label>
            <label className="form_builder-check">
              <Input type="checkbox" checked={draft.enabled} onChange={(e) => change({ enabled: e.target.checked })} />
              <span>Accepting responses</span>
            </label>
          </section>

          <section className="form_builder-section" aria-labelledby="form_builder-where">
            <h2 id="form_builder-where" className="form_builder-heading">Where the tasks go</h2>
            <div className="form_builder-grid">
              <label className="form_builder-field">
                <span>Status</span>
                <Select value={draft.default_status} onChange={(e) => change({ default_status: e.target.value as TaskStatus })}>
                  {TASK_STATUSES.map((status) => <option key={status} value={status}>{DEFAULT_STATUS_LABEL[status]}</option>)}
                </Select>
              </label>
              <label className="form_builder-field">
                <span>Epic</span>
                <Select value={draft.epic_id} onChange={(e) => change({ epic_id: e.target.value })}>
                  <option value="">None</option>
                  {epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.title}</option>)}
                </Select>
              </label>
              <label className="form_builder-field">
                <span>Folder or project</span>
                <Select value={draft.folder_id} onChange={(e) => change({ folder_id: e.target.value })}>
                  <option value="">None</option>
                  {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
                </Select>
              </label>
              <label className="form_builder-field">
                <span>Assign to</span>
                <Select value={draft.assignee_id} onChange={(e) => change({ assignee_id: e.target.value })}>
                  <option value="">Nobody</option>
                  {members.map((member) => <option key={member.user_id} value={member.user_id}>{member.user.name}</option>)}
                </Select>
              </label>
            </div>
          </section>

          <PublicLink form={form} draft={draft} canManage={canManage} onChange={(publicAccess) => change({ public_access: publicAccess })} />

          <section className="form_builder-section" aria-labelledby="form_builder-questions">
            <h2 id="form_builder-questions" className="form_builder-heading">Questions</h2>
            <ol className="form_builder-questions">
              {draft.questions.map((question, index) => (
                <QuestionEditor
                  key={question.id}
                  question={question}
                  number={index + 1}
                  count={draft.questions.length}
                  taken={takenTargets(draft.questions, question)}
                  onChange={(next) => changeQuestions(draft.questions.map((q) => (q.id === question.id ? next : q)))}
                  onMove={(delta) => changeQuestions(moveQuestion(draft.questions, index, delta))}
                  onRemove={() => changeQuestions(draft.questions.filter((q) => q.id !== question.id))}
                />
              ))}
            </ol>
            <Button
              type="button"
              variant="secondary"
              onClick={() => changeQuestions([...draft.questions, newQuestion(draft.questions)])}
              disabled={draft.questions.length >= MAX_QUESTIONS}
              className="form_builder-add"
            >
              <Plus className="form_builder-icon" aria-hidden="true" />
              Add question
            </Button>
          </section>

          <div className="form_builder-save">
            <FormError message={updateForm.isError ? errorMessage(updateForm.error) : null} />
            {saved && <p className="form_builder-saved" role="status">Saved</p>}
            <Button type="submit" variant="primary" disabled={updateForm.isPending}>Save form</Button>
          </div>
        </form>

        <Responses formId={form.id} />
      </div>
    </>
  )
}

type PublicLinkProps = { form: TaskForm; draft: TaskFormDraft; canManage: boolean; onChange: (publicAccess: boolean) => void }

// Opening a form to anyone with its link is for admins and owners, and only
// where the server allows it; everyone else just sees whether it is on.
function PublicLink({ form, draft, canManage, onChange }: PublicLinkProps) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const link = form.public_access && form.token ? publicFormUrl(form.token, window.location) : null
  const unavailable = !form.public_links_available && !draft.public_access

  function copy() {
    if (!link) return
    // clipboard is missing on insecure pages, hence the promise wrapper.
    Promise.resolve().then(() => navigator.clipboard.writeText(link)).then(() => setCopyState('copied'), () => setCopyState('failed'))
  }

  // Nothing to decide for a member while the form is private.
  if (!canManage && !form.public_access) return null

  return (
    <section className="form_builder-section" aria-labelledby="form_builder-public">
      <h2 id="form_builder-public" className="form_builder-heading">Public link</h2>
      {canManage ? (
        <label className="form_builder-check">
          <Input type="checkbox" checked={draft.public_access} disabled={unavailable} onChange={(e) => onChange(e.target.checked)} />
          <span>Anyone with the link can fill in this form, without an account</span>
        </label>
      ) : (
        <p className="form_builder-hint">This form has a public link. Only an admin of this Space can turn it off or on.</p>
      )}
      {unavailable && <p className="form_builder-hint">Public forms are switched off on this server, so a form can&rsquo;t be opened to everyone yet.</p>}
      {canManage && draft.public_access && !link && <p className="form_builder-hint">Save the form to get its link.</p>}
      {link && draft.public_access && (
        <div className="form_builder-link">
          <Input readOnly aria-label="Link to share" value={link} onFocus={(e) => e.target.select()} />
          <Button type="button" variant="secondary" onClick={copy}>{copyState === 'copied' ? 'Copied' : 'Copy link'}</Button>
        </div>
      )}
      {copyState === 'failed' && <FormError message="Couldn't copy the link. Select it and copy it by hand." />}
      <p className="form_builder-hint">
        Anyone with the link can create tasks in this Space, up to {PUBLIC_HOURLY_LIMIT} responses an hour. Turn the option off and on again to get a new link.
      </p>
    </section>
  )
}

function Responses({ formId }: { formId: number }) {
  const { data: submissions = [], isLoading } = useTaskFormSubmissions(formId)

  return (
    <section className="form_builder-section" aria-labelledby="form_builder-responses">
      <h2 id="form_builder-responses" className="form_builder-heading">Responses</h2>
      {isLoading && <Loader2 className="form_builder-spinner" aria-label="Loading" />}
      {!isLoading && submissions.length === 0 && <p className="form_builder-hint">No responses yet.</p>}
      <ul className="form_builder-responses">
        {submissions.map((submission) => (
          <li key={submission.id} className="form_builder-response">
            <p className="form_builder-response-title">{submission.task_title}</p>
            <p className="form_builder-response-meta">
              {submission.submitted_by_name ?? 'Public link'} · {format(parseISO(submission.created_at), 'MMM d, yyyy')} · {DEFAULT_STATUS_LABEL[submission.task_status]}
            </p>
            <dl className="form_builder-answers">
              {submission.answers.map((answer, index) => (
                <div key={index} className="form_builder-answer">
                  <dt>{answer.label}</dt>
                  <dd>{answer.value}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      {submissions.length >= 50 && <p className="form_builder-hint">Showing the latest 50 responses.</p>}
    </section>
  )
}
