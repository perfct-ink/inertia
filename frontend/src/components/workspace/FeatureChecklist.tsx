import { Input } from '@/components/ui'
import { toggleFeature, WORKSPACE_FEATURES, type WorkspaceFeature } from '@/data/workspaceFeature'

// A checkbox per optional section. Turning one off only hides it.
export function FeatureChecklist({ value, onChange, disabled }: { value: WorkspaceFeature[]; onChange: (next: WorkspaceFeature[]) => void; disabled?: boolean }) {
  return (
    <fieldset className="feature_checklist" disabled={disabled}>
      <legend>Features this Space uses</legend>
      {WORKSPACE_FEATURES.map(({ key, label }) => (
        <label key={key} className="feature_checklist-item">
          <Input type="checkbox" checked={value.includes(key)} onChange={(e) => onChange(toggleFeature(value, key, e.target.checked))} />
          {label}
        </label>
      ))}
    </fieldset>
  )
}
