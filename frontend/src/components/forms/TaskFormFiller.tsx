import { useState, type FormEvent } from 'react'
import { Button, DatePicker, FormError, Input, Select, Textarea } from '@/components/ui'
import { answerProblems, emptyAnswers } from '@/data/taskForm'
import type { FillableForm, TaskFormAnswers, TaskFormQuestion } from '@/types/taskForm'
import './TaskFormFiller.scss'

type Props = {
  form: FillableForm
  busy: boolean
  // What the server said was wrong with the last attempt, if anything.
  error: string | null
  submitLabel?: string
  // Public pages add a field people never see; bots fill it in (see PublicFormsController).
  honeypot?: boolean
  onSubmit: (answers: TaskFormAnswers, honeypot: string) => void
}

// A form to fill in: one control per question. Used by the signed-in fill
// page and the public page, so both ask the same way. Required questions left
// blank are reported here before anything is sent; the server checks the rest.
export default function TaskFormFiller({ form, busy, error, submitLabel = 'Submit', honeypot = false, onSubmit }: Props) {
  const [answers, setAnswers] = useState<TaskFormAnswers>(() => emptyAnswers(form.questions))
  const [trap, setTrap] = useState('')
  const [problems, setProblems] = useState<Record<string, string>>({})

  const set = (id: string, value: string) => setAnswers((current) => ({ ...current, [id]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const found = answerProblems(form.questions, answers)
    setProblems(found)
    if (Object.keys(found).length === 0) onSubmit(answers, trap)
  }

  return (
    <form className="view-task_form_filler" onSubmit={submit} noValidate aria-label={form.title}>
      {form.questions.map((question) => (
        <label key={question.id} className="task_form_filler-question">
          <span className="task_form_filler-label">
            {question.label}
            {question.required && <span className="task_form_filler-required" aria-hidden="true"> *</span>}
          </span>
          <QuestionControl
            question={question}
            value={answers[question.id] ?? ''}
            invalid={question.id in problems}
            onChange={(value) => set(question.id, value)}
          />
          <FormError message={problems[question.id]} />
        </label>
      ))}

      {honeypot && (
        <div className="task_form_filler-trap" aria-hidden="true">
          <label>
            Website
            <Input name="website" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
          </label>
        </div>
      )}

      <FormError message={error} />
      <div className="task_form_filler-actions">
        <Button type="submit" variant="primary" disabled={busy}>{busy ? 'Sending…' : submitLabel}</Button>
      </div>
    </form>
  )
}

type ControlProps = { question: TaskFormQuestion; value: string; invalid: boolean; onChange: (value: string) => void }

function QuestionControl({ question, value, invalid, onChange }: ControlProps) {
  const common = { 'aria-required': question.required, 'aria-invalid': invalid }
  switch (question.kind) {
    case 'long_text':
      return <Textarea {...common} rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    case 'date':
      return <DatePicker {...common} value={value} onChange={(e) => onChange(e.target.value)} />
    case 'choice':
      return (
        <Select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">Choose…</option>
          {question.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </Select>
      )
    default:
      return <Input {...common} value={value} onChange={(e) => onChange(e.target.value)} />
  }
}
