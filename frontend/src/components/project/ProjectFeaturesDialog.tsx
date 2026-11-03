import { useState } from 'react'
import { Button, FormError, Input, Modal } from '@/components/ui'
import { useUpdateFolder } from '@/api/folders'
import { errorMessage } from '@/api/tables'
import { PROJECT_FEATURE_GROUPS, enabledProjectFeatures, toggleProjectFeature, type ProjectFeature } from '@/data/projectFeature'
import type { Folder } from '@/types'
import './ProjectFeaturesDialog.scss'

// Choose which pages a project shows in the sidebar. Its files always show;
// turning a page off only hides it.
export default function ProjectFeaturesDialog({ project, onClose }: { project: Folder | null; onClose: () => void }) {
  return (
    <Modal
      open={project !== null}
      wide
      className="ui-project_features_dialog-modal"
      title={`Features for ${project?.name ?? 'project'}`}
      description="Turn off the pages this project doesn't use. Its files always show, nothing is deleted, and turning a page back on shows it again."
      onClose={onClose}
    >
      {project && <ProjectFeaturesForm project={project} onClose={onClose} />}
    </Modal>
  )
}

// Mounted only while the dialog is open, so each opening starts from what the
// project has saved.
function ProjectFeaturesForm({ project, onClose }: { project: Folder; onClose: () => void }) {
  const updateFolder = useUpdateFolder()
  const [value, setValue] = useState<ProjectFeature[]>(() => enabledProjectFeatures(project))
  const [error, setError] = useState('')

  function save() {
    setError('')
    updateFolder.mutate({ id: project.id, features: value }, { onSuccess: onClose, onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <div className="ui-project_features_dialog">
      {PROJECT_FEATURE_GROUPS.map(({ heading, features }) => (
        <fieldset key={heading ?? 'general'} className="ui-project_features_dialog-group">
          <legend className="ui-project_features_dialog-heading">{heading ?? 'General'}</legend>
          <div className="ui-project_features_dialog-items">
            {features.map(({ key, label }) => (
              <label key={key} className="ui-project_features_dialog-item">
                <Input type="checkbox" checked={value.includes(key)} onChange={(e) => setValue(toggleProjectFeature(value, key, e.target.checked))} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ))}

      <FormError message={error} />

      <div className="ui-modal-actions">
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={updateFolder.isPending} onClick={save}>Save</Button>
      </div>
    </div>
  )
}
