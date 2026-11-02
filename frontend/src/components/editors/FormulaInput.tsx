import { useId } from 'react'
import { FormError, Input, Select } from '@/components/ui'
import { FORMULA_HELP, MAX_FORMULA_LENGTH, type FormulaField } from '@/data/formula'
import './FormulaInput.scss'

interface FormulaInputProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  // The collection's other fields, offered for inserting as {Field name}.
  fields: FormulaField[]
  // What is wrong with the formula, shown once the person has left the box.
  problem: string | null
  showProblem: boolean
  inputClassName?: string
}

// The formula box of the Collection field form: type or build an expression,
// with the fields to pick from and a check of what was written.
export default function FormulaInput({ value, onChange, onBlur, fields, problem, showProblem, inputClassName }: FormulaInputProps) {
  const helpId = useId()
  return <div className="formula_input">
    <label className="formula_input-label">Formula
      <Input
        required
        maxLength={MAX_FORMULA_LENGTH}
        spellCheck={false}
        autoComplete="off"
        autoCapitalize="off"
        placeholder="{Price} * {Quantity}"
        aria-describedby={helpId}
        aria-invalid={showProblem && !!problem}
        className={inputClassName}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
      />
    </label>
    {fields.length > 0 && <label className="formula_input-label formula_input-label--field">Insert field
      <Select className={inputClassName} value="" onChange={e => { if (e.target.value) onChange(`${value}{${e.target.value}}`) }}>
        <option value="">Choose a field</option>
        {fields.map(field => <option key={field.id} value={field.name}>{field.name}</option>)}
      </Select>
    </label>}
    <p id={helpId} className="formula_input-help">{FORMULA_HELP}</p>
    <FormError message={showProblem ? problem : null} className="formula_input-problem" />
  </div>
}
