import { useParams } from 'react-router-dom'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import TaskFormFiller from '@/components/forms/TaskFormFiller'
import { usePublicTaskForm, useSubmitPublicTaskForm } from '@/api/taskForms'
import { usePageTitle } from '@/hooks/usePageTitle'
import { errorMessage } from '@/util/errorMessage'
import './PublicFormScreen.scss'

// A form opened to anyone with its link: no account, no Space chrome. The
// answers become a task in the Space that owns the form; the person filling it
// in only ever sees the questions (see PublicFormsController).
export default function PublicFormScreen() {
  const { token } = useParams()
  const { data: form, isLoading, isError } = usePublicTaskForm(token)
  const submit = useSubmitPublicTaskForm(token ?? '')
  usePageTitle(form?.title ?? 'Form')

  return (
    <main className="view-public_form">
      <div className="public_form-card">
        {isLoading && <Loader2 className="public_form-spinner" aria-label="Loading" />}

        {isError && (
          <div className="public_form-message" role="alert">
            <h1 className="public_form-title">This form isn&rsquo;t available</h1>
            <p>The link may be wrong, or the form may have been closed.</p>
          </div>
        )}

        {form && submit.isSuccess && (
          <div className="public_form-message" role="status">
            <CheckCircle2 className="public_form-done" aria-hidden="true" />
            <h1 className="public_form-title">Thanks, your response was sent</h1>
            <Button variant="secondary" onClick={() => submit.reset()}>Send another response</Button>
          </div>
        )}

        {form && !submit.isSuccess && (
          <>
            <h1 className="public_form-title">{form.title}</h1>
            {form.description && <p className="public_form-description">{form.description}</p>}
            <TaskFormFiller
              form={form}
              honeypot
              busy={submit.isPending}
              error={submit.isError ? errorMessage(submit.error) : null}
              onSubmit={(answers, website) => submit.mutate({ answers, website })}
            />
          </>
        )}
      </div>
    </main>
  )
}
