import { X } from 'lucide-react'
import { Button, Input, Select } from '@/components/ui'
import {
  AUTOMATION_FIELDS,
  AUTOMATION_FIELD_KEYS,
  CONDITION_OPERATOR_LABEL,
  changeConditionField,
  changeConditionOperator,
  fieldOptions,
  operatorsFor,
  optionValue,
  toggleConditionValue,
  type AutomationCondition,
  type AutomationContext,
  type AutomationFieldKey,
  type ConditionOperator,
} from '@/data/automation'
import FieldSelect from './FieldSelect'

type Props = {
  // Position in the rule, from 0.
  index: number
  condition: AutomationCondition
  context: AutomationContext
  onChange: (condition: AutomationCondition) => void
  onRemove: () => void
}

// One "if" line: a task field, how to compare it, and what to compare with.
// "Is any of" shows the options as checkboxes; the rest pick one value.
export default function ConditionRow({ index, condition, context, onChange, onRemove }: Props) {
  const name = `Condition ${index + 1}`
  const ticked = Array.isArray(condition.value) ? condition.value.map(optionValue) : []

  return (
    <li className="automations-row">
      <Select aria-label={`${name} field`} value={condition.field} onChange={(e) => onChange(changeConditionField(condition, e.target.value as AutomationFieldKey, context))}>
        {AUTOMATION_FIELD_KEYS.map((key) => <option key={key} value={key}>{AUTOMATION_FIELDS[key].label}</option>)}
      </Select>
      <Select aria-label={`${name} comparison`} value={condition.operator} onChange={(e) => onChange(changeConditionOperator(condition, e.target.value as ConditionOperator, context))}>
        {operatorsFor(condition.field).map((operator) => <option key={operator} value={operator}>{CONDITION_OPERATOR_LABEL[operator]}</option>)}
      </Select>
      {condition.operator === 'in' ? (
        <fieldset className="automations-checks">
          <legend className="automations-visually_hidden">{`${name} values`}</legend>
          {fieldOptions(condition.field, context).map((option) => (
            <label key={option.value} className="automations-check">
              <Input type="checkbox" checked={ticked.includes(option.value)} onChange={() => onChange(toggleConditionValue(condition, option.value, context))} />
              <span>{option.label}</span>
            </label>
          ))}
        </fieldset>
      ) : (
        <FieldSelect
          field={condition.field}
          value={Array.isArray(condition.value) ? null : condition.value}
          label={`${name} value`}
          context={context}
          onChange={(value) => onChange({ ...condition, value })}
        />
      )}
      <Button type="button" variant="ghost" aria-label={`Remove ${name.toLowerCase()}`} title={`Remove ${name.toLowerCase()}`} onClick={onRemove} className="automations-remove">
        <X className="automations-icon" aria-hidden="true" />
      </Button>
    </li>
  )
}
