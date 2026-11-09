import { Input, classNames } from '@/components/ui'
import { WORKSPACE_FEATURE_GROUPS, toggleFeature, type WorkspaceFeature } from '@/data/workspaceFeature'
import './FeatureChecklist.scss'

interface FeatureChecklistProps {
  value: WorkspaceFeature[]
  onChange: (next: WorkspaceFeature[]) => void
  // Read-only for people who cannot manage the Space.
  disabled?: boolean
}

// A checkbox per optional page, grouped as the sidebar rail groups them. Used by
// the New Space dialog and the Space's Features dialog. Turning one off only
// hides it from the rail and quick add; nothing is deleted.
export function FeatureChecklist({ value, onChange, disabled }: FeatureChecklistProps) {
  return (
    <div className="feature_checklist">
      {WORKSPACE_FEATURE_GROUPS.map((group) => (
        <fieldset key={group.heading} className="feature_checklist-group" disabled={disabled}>
          <legend className="feature_checklist-heading">{group.heading}</legend>
          {group.features.map(({ key, label }) => (
            <label key={key} className={classNames('feature_checklist-option', !disabled && 'feature_checklist-option--editable')}>
              <Input type="checkbox" checked={value.includes(key)} onChange={(e) => onChange(toggleFeature(value, key, e.target.checked))} />
              {label}
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  )
}
