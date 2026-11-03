import { Select } from '@/components/ui'
import {
  fieldOptions,
  optionValue,
  storedValue,
  valueLabel,
  type AutomationContext,
  type AutomationFieldKey,
  type AutomationParam,
  type AutomationScalar,
} from '@/data/automation'

type FieldSelectProps = {
  field: AutomationFieldKey
  value: AutomationScalar | undefined
  label: string
  // Adds a first choice for "nothing picked" (a trigger setting left on any).
  anyLabel?: string
  context: AutomationContext
  onChange: (value: AutomationScalar) => void
}

// One field's options as a dropdown: statuses, priorities, or the people of
// the Space. A saved value that is no longer an option (someone who left)
// stays selectable so it is not silently swapped for another.
export default function FieldSelect({ field, value, label, anyLabel, context, onChange }: FieldSelectProps) {
  const options = fieldOptions(field, context)
  const current = optionValue(value)
  const missing = current !== '' && !options.some((option) => option.value === current)
  return (
    <Select aria-label={label} value={current} onChange={(e) => onChange(storedValue(field, e.target.value))}>
      {anyLabel && <option value="">{anyLabel}</option>}
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      {missing && <option value={current}>{valueLabel(field, value, context)}</option>}
    </Select>
  )
}

type ParamFieldsProps = {
  params: AutomationParam[]
  config: Record<string, AutomationScalar>
  // Names the dropdowns for screen readers: "Trigger from", "Action 1 status".
  prefix: string
  context: AutomationContext
  onChange: (key: string, value: AutomationScalar) => void
}

// The settings of a trigger or action, one dropdown each.
export function ParamFields({ params, config, prefix, context, onChange }: ParamFieldsProps) {
  return (
    <>
      {params.map((param) => (
        <FieldSelect
          key={param.key}
          field={param.field}
          value={config[param.key]}
          label={`${prefix} ${param.label.toLowerCase()}`}
          anyLabel={param.anyLabel}
          context={context}
          onChange={(value) => onChange(param.key, value)}
        />
      ))}
    </>
  )
}
