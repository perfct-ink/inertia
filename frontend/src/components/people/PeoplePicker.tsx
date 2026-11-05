import { Input, classNames } from '@/components/ui'
import { toggleId } from '@/data/person'
import type { WorkspaceMember } from '@/types'
import './PeoplePicker.scss'

interface PeoplePickerProps {
  label: string
  members: WorkspaceMember[]
  value: number[]
  onChange: (ids: number[]) => void
  className?: string
}

// A disclosure of Space members with a checkbox each, for picking any number
// of people (assignees, watchers). Native <details> keeps it keyboard and
// screen-reader friendly.
export function PeoplePicker({ label, members, value, onChange, className }: PeoplePickerProps) {
  return (
    <details className={classNames('people_picker', className)}>
      <summary className="people_picker-summary">{label}{value.length > 0 && ` (${value.length})`}</summary>
      <ul className="people_picker-list" aria-label={label}>
        {members.map((m) => (
          <li key={m.user_id}>
            <label className="people_picker-option">
              <Input type="checkbox" checked={value.includes(m.user_id)} onChange={() => onChange(toggleId(value, m.user_id))} />
              <span>{m.user.name}</span>
            </label>
          </li>
        ))}
      </ul>
    </details>
  )
}
