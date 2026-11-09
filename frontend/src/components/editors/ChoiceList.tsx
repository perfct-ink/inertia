import { Input } from '@/components/ui'
import './ChoiceList.scss'

// A cell that picks several things from a list: a summary line that opens a
// list of checkboxes. Used for the files of a Files field and the choices of a
// Multi select. `selected` follows the order of `options`.
export default function ChoiceList<V extends string | number>({ label, summary, options, selected, empty, onChange }: {
  label: string
  summary: string
  options: { value: V; label: string }[]
  selected: V[]
  // Said instead of the list when there is nothing to choose from.
  empty: string
  onChange: (next: V[]) => void
}) {
  function toggle(value: V, checked: boolean) {
    const next = new Set(checked ? [...selected, value] : selected.filter((item) => item !== value))
    onChange(options.filter((option) => next.has(option.value)).map((option) => option.value))
  }
  return (
    <details className="choice_list">
      <summary>{summary}</summary>
      <fieldset aria-label={label}>
        {options.map((option) => (
          <label key={option.value} className="choice_list-option">
            <Input type="checkbox" checked={selected.includes(option.value)} onChange={(e) => toggle(option.value, e.target.checked)} />
            {option.label}
          </label>
        ))}
        {options.length === 0 && <p>{empty}</p>}
      </fieldset>
    </details>
  )
}
