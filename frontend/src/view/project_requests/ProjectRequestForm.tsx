import { useState, type FormEvent } from 'react'
import { Button, DatePicker, FormError, Input, Select, Textarea } from '@/components/ui'
import {
  PROJECT_REQUEST_PRIORITIES,
  PROJECT_REQUEST_PRIORITY_LABEL,
  projectRequestFormError,
  type ProjectRequestDraft,
} from '@/data/projectRequest'
import type { ProjectRequestPriority } from '@/types'

type Props = {
  initial: ProjectRequestDraft
  submitLabel: string
  busy: boolean
  onSubmit: (draft: ProjectRequestDraft) => void
  onCancel: () => void
}

// The project intake form: used to submit a new request and to edit a
// pending one. A bad name or date range is reported here before any call.
export default function ProjectRequestForm({ initial, submitLabel, busy, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  const set = <K extends keyof ProjectRequestDraft>(key: K, value: ProjectRequestDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = projectRequestFormError(draft)
    setError(problem)
    if (!problem) onSubmit(draft)
  }

  return (
    <form className="project_requests-form" onSubmit={submit} noValidate aria-label="Project request">
      <label className="project_requests-field">
        <span>Project name</span>
        <Input
          autoFocus
          value={draft.name}
          aria-required="true"
          aria-invalid={error != null && !draft.name.trim()}
          placeholder="e.g. Billing revamp"
          onChange={(e) => set('name', e.target.value)}
        />
      </label>
      <label className="project_requests-field">
        <span>What is it?</span>
        <Textarea
          rows={3}
          value={draft.description}
          placeholder="What the project is and what it should deliver"
          onChange={(e) => set('description', e.target.value)}
        />
      </label>
      <label className="project_requests-field">
        <span>Why does it matter?</span>
        <Textarea
          rows={3}
          value={draft.justification}
          placeholder="The problem it solves, who asked, and what happens if it waits"
          onChange={(e) => set('justification', e.target.value)}
        />
      </label>
      <div className="project_requests-form-row">
        <label className="project_requests-field">
          <span>Start date</span>
          <DatePicker value={draft.start_date} onChange={(e) => set('start_date', e.target.value)} />
        </label>
        <label className="project_requests-field">
          <span>Target date</span>
          <DatePicker value={draft.target_date} onChange={(e) => set('target_date', e.target.value)} />
        </label>
        <label className="project_requests-field">
          <span>Priority</span>
          <Select value={draft.priority} onChange={(e) => set('priority', e.target.value as ProjectRequestPriority)}>
            {PROJECT_REQUEST_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>{PROJECT_REQUEST_PRIORITY_LABEL[priority]}</option>
            ))}
          </Select>
        </label>
      </div>
      <FormError message={error} />
      <div className="project_requests-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>{submitLabel}</Button>
      </div>
    </form>
  )
}
