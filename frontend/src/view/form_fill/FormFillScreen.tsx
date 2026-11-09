import { Link, useParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import TaskFormFiller from '@/components/forms/TaskFormFiller'
import { useSubmitTaskForm, useTaskForm } from '@/api/taskForms'
import { useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import './FormFillScreen.scss'

// Fill in one of the Space's forms as a signed-in member; the answers become a
// task in the Space.
export default function FormFillScreen() {
  const id = Number(useParams().id)
  const { data: form, isLoading } = useTaskForm(id)
  const { data: workspace } = useWorkspace()
  const submit = useSubmitTaskForm(id)
  usePageTitle(form?.title ?? 'Form')

  return (
    <WorkspaceLayout>
      <div className="view-form_fill">
        <div className="form_fill-card">
          <Link to="/forms" className="form_fill-back">&larr; All forms</Link>

          {isLoading && <Loader2 className="form_fill-spinner" aria-label="Loading" />}

          {!isLoading && !form && (
            <p className="form_fill-message" role="alert">This form doesn&rsquo;t exist, or it was deleted.</p>
          )}

          {form && !form.enabled && (
            <p className="form_fill-message" role="status">&ldquo;{form.title}&rdquo; is closed and takes no new responses.</p>
          )}

          {form && form.enabled && !canWriteWorkspace(workspace?.role) && (
            <p className="form_fill-message" role="status">You have view-only access to this Space, so you can&rsquo;t fill in forms.</p>
          )}

          {form && form.enabled && canWriteWorkspace(workspace?.role) && submit.isSuccess && (
            <div className="form_fill-message" role="status">
              <CheckCircle2 className="form_fill-done" aria-hidden="true" />
              <h1 className="form_fill-title">Response sent</h1>
              <p>
                Created the task &ldquo;{submit.data.task_title}&rdquo;.{' '}
                <Link to="/tasks?view=backlog" className="form_fill-link">Open tasks</Link>
              </p>
              <Button variant="secondary" onClick={() => submit.reset()}>Fill in again</Button>
            </div>
          )}

          {form && form.enabled && canWriteWorkspace(workspace?.role) && !submit.isSuccess && (
            <>
              <h1 className="form_fill-title">{form.title}</h1>
              {form.description && <p className="form_fill-description">{form.description}</p>}
              <TaskFormFiller
                form={form}
                busy={submit.isPending}
                error={submit.isError ? errorMessage(submit.error) : null}
                onSubmit={(answers) => submit.mutate(answers)}
              />
            </>
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}
