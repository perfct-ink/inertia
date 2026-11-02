import { useId, useState, type FormEvent } from 'react'
import { LayoutTemplate, Loader2 } from 'lucide-react'
import { Button, DatePicker, FormError, Input, Modal, classNames } from '@/components/ui'
import { useApplyTemplate } from '@/api/templates'
import { TEMPLATE_FORM, defaultName, describeTemplate, planTemplate, templatesOf, type TemplateKind } from '@/data/template'
import { todayISO } from '@/util/date'
import './TemplatePicker.scss'

// A "From template" button and its dialog: pick a built-in template for a
// project, roadmap or sprint, name it and set its start date, and it is
// created with its starter items. The lists on the page refresh when it is done.
export default function TemplatePicker({ kind, className }: { kind: TemplateKind; className?: string }) {
  const templates = templatesOf(kind)
  const form = TEMPLATE_FORM[kind]
  const apply = useApplyTemplate()
  const groupId = useId()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(templates[0].id)
  const [name, setName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [error, setError] = useState('')
  const template = templates.find((item) => item.id === selectedId) ?? templates[0]
  const canSubmit = !form.startDate || startDate !== ''

  function show() {
    setSelectedId(templates[0].id)
    setName('')
    setStartDate(todayISO())
    setError('')
    setOpen(true)
  }

  // Closing mid-request would hide a failure, so wait for it to finish.
  function close() {
    if (!apply.isPending) setOpen(false)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!canSubmit) return
    setError('')
    apply.mutate(planTemplate(template, { name, startDate }), {
      onSuccess: () => setOpen(false),
      onError: (failure) => setError(failure.message),
    })
  }

  return (
    <>
      <Button variant="secondary" onClick={show} className={classNames('template_picker-open', className)}>
        <LayoutTemplate className="template_picker-icon" aria-hidden="true" />
        From template
      </Button>
      <Modal open={open} title={form.title} description="Pick a starting point. Everything it adds can be edited or deleted afterwards." onClose={close}>
        <form onSubmit={submit} className="ui-modal-form template_picker">
          <div role="radiogroup" aria-labelledby={groupId} className="template_picker-options">
            <span id={groupId} className="template_picker-legend">Template</span>
            {templates.map((item) => (
              <label key={item.id} className="template_picker-option">
                <Input
                  type="radio"
                  name={`template-${kind}`}
                  value={item.id}
                  checked={item.id === template.id}
                  onChange={() => setSelectedId(item.id)}
                />
                <span className="template_picker-option-text">
                  <span className="template_picker-option-label">{item.label}</span>
                  <span className="template_picker-option-description">{item.description}</span>
                  <span className="template_picker-option-adds">Adds {describeTemplate(item)}</span>
                </span>
              </label>
            ))}
          </div>

          {form.name && (
            <label className="template_picker-field">
              <span>Name</span>
              <Input
                value={name}
                placeholder={defaultName(template, startDate || todayISO())}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
          )}
          {form.startDate && (
            <label className="template_picker-field">
              <span>Start date</span>
              <DatePicker required value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </label>
          )}

          <FormError message={error} />
          <div className="ui-modal-actions">
            <Button type="button" variant="secondary" onClick={close} disabled={apply.isPending}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={apply.isPending || !canSubmit} className="template_picker-submit">
              {apply.isPending && <Loader2 className="template_picker-icon template_picker-icon--spin" aria-hidden="true" />}
              {apply.isPending ? 'Creating…' : form.submit}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
