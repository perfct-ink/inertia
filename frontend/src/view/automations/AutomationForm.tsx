import { useId, useState, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { Button, FormError, Input, Select } from '@/components/ui'
import {
  AUTOMATION_LIMITS,
  AUTOMATION_TRIGGERS,
  draftError,
  newAction,
  newCondition,
  ruleInput,
  triggerDef,
  type AutomationContext,
  type AutomationDraft,
  type AutomationTriggerType,
} from '@/data/automation'
import ActionRow from './ActionRow'
import ConditionRow from './ConditionRow'
import { ParamFields } from './FieldSelect'

type Props = {
  initial: AutomationDraft
  submitLabel: string
  busy: boolean
  context: AutomationContext
  onSubmit: (draft: AutomationDraft) => void
  onCancel: () => void
}

const replaceAt = <T,>(list: T[], index: number, item: T) => list.map((existing, i) => (i === index ? item : existing))

// The rule builder: a name, then When (the trigger), If (conditions, all of
// which must hold) and Then (actions, run in order). A mistake is reported
// here before anything is sent.
export default function AutomationForm({ initial, submitLabel, busy, context, onSubmit, onCancel }: Props) {
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const trigger = triggerDef(draft.trigger_type)
  const id = useId()

  const set = <K extends keyof AutomationDraft>(key: K, value: AutomationDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = draftError(draft)
    setError(problem)
    if (!problem) onSubmit(ruleInput(draft))
  }

  return (
    <form className="automations-form" onSubmit={submit} noValidate aria-label="Automation">
      <label className="automations-field">
        <span>Name</span>
        <Input
          autoFocus
          value={draft.name}
          maxLength={AUTOMATION_LIMITS.nameLength}
          aria-required="true"
          aria-invalid={error != null && !draft.name.trim()}
          placeholder="e.g. Finished work goes to Ada"
          onChange={(e) => set('name', e.target.value)}
        />
      </label>

      <section className="automations-step" aria-labelledby={`${id}-when`}>
        <h3 id={`${id}-when`} className="automations-step-title">When</h3>
        <div className="automations-row">
          {AUTOMATION_TRIGGERS.length > 1 ? (
            <Select
              aria-label="Trigger"
              value={draft.trigger_type}
              onChange={(e) => setDraft((current) => ({ ...current, trigger_type: e.target.value as AutomationTriggerType, trigger_config: {} }))}
            >
              {AUTOMATION_TRIGGERS.map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>)}
            </Select>
          ) : (
            <p className="automations-trigger">{trigger?.label}</p>
          )}
          <ParamFields
            params={trigger?.params ?? []}
            config={draft.trigger_config}
            prefix="Trigger"
            context={context}
            onChange={(key, value) => set('trigger_config', { ...draft.trigger_config, [key]: value })}
          />
        </div>
      </section>

      <section className="automations-step" aria-labelledby={`${id}-if`}>
        <h3 id={`${id}-if`} className="automations-step-title">If</h3>
        {draft.conditions.length === 0 && <p className="automations-hint">No conditions: it runs every time.</p>}
        {draft.conditions.length > 0 && (
          <ul className="automations-rows" aria-label="Conditions">
            {draft.conditions.map((condition, index) => (
              <ConditionRow
                key={index}
                index={index}
                condition={condition}
                context={context}
                onChange={(next) => set('conditions', replaceAt(draft.conditions, index, next))}
                onRemove={() => set('conditions', draft.conditions.filter((_, i) => i !== index))}
              />
            ))}
          </ul>
        )}
        {draft.conditions.length < AUTOMATION_LIMITS.conditionsPerRule && (
          <Button type="button" variant="secondary" className="automations-add" onClick={() => set('conditions', [...draft.conditions, newCondition('status', context)])}>
            <Plus className="automations-icon" aria-hidden="true" />
            Add condition
          </Button>
        )}
      </section>

      <section className="automations-step" aria-labelledby={`${id}-then`}>
        <h3 id={`${id}-then`} className="automations-step-title">Then</h3>
        <ul className="automations-rows" aria-label="Actions">
          {draft.actions.map((action, index) => (
            <ActionRow
              key={index}
              index={index}
              action={action}
              context={context}
              removable={draft.actions.length > 1}
              onChange={(next) => set('actions', replaceAt(draft.actions, index, next))}
              onRemove={() => set('actions', draft.actions.filter((_, i) => i !== index))}
            />
          ))}
        </ul>
        {draft.actions.length < AUTOMATION_LIMITS.actionsPerRule && (
          <Button type="button" variant="secondary" className="automations-add" onClick={() => set('actions', [...draft.actions, newAction('set_status', context)])}>
            <Plus className="automations-icon" aria-hidden="true" />
            Add action
          </Button>
        )}
      </section>

      <FormError message={error} />
      <div className="automations-form-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={busy}>{submitLabel}</Button>
      </div>
    </form>
  )
}
