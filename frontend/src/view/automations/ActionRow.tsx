import { X } from 'lucide-react'
import { Button, Select } from '@/components/ui'
import { AUTOMATION_ACTIONS, actionDef, newAction, type AutomationAction, type AutomationActionType, type AutomationContext } from '@/data/automation'
import { ParamFields } from './FieldSelect'

type Props = {
  // Position in the rule, from 0.
  index: number
  action: AutomationAction
  context: AutomationContext
  // A rule keeps at least one action, so the last one cannot be removed.
  removable: boolean
  onChange: (action: AutomationAction) => void
  onRemove: () => void
}

// One "then" line: what to do, and its settings.
export default function ActionRow({ index, action, context, removable, onChange, onRemove }: Props) {
  const name = `Action ${index + 1}`
  return (
    <li className="automations-row">
      <Select aria-label={name} value={action.type} onChange={(e) => onChange(newAction(e.target.value as AutomationActionType, context))}>
        {AUTOMATION_ACTIONS.map((definition) => <option key={definition.type} value={definition.type}>{definition.label}</option>)}
      </Select>
      <ParamFields
        params={actionDef(action.type)?.params ?? []}
        config={action.config}
        prefix={name}
        context={context}
        onChange={(key, value) => onChange({ ...action, config: { ...action.config, [key]: value } })}
      />
      {removable && (
        <Button type="button" variant="ghost" aria-label={`Remove ${name.toLowerCase()}`} title={`Remove ${name.toLowerCase()}`} onClick={onRemove} className="automations-remove">
          <X className="automations-icon" aria-hidden="true" />
        </Button>
      )}
    </li>
  )
}
