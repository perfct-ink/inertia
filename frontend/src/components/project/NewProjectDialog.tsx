import { useState, type FormEvent, type ReactNode } from 'react'
import { FolderKanban, Trash2 } from 'lucide-react'
import { Button, FormError, Input, Modal, classNames } from '@/components/ui'
import { useCreateProject } from '@/api/folders'
import { useDeleteProjectType, useProjectTypes } from '@/api/projectTypes'
import { errorMessage } from '@/util/errorMessage'
import { BLANK_TYPE, PROJECT_TYPES, describeStart, projectStart } from '@/data/projectType'
import type { Folder, ProjectTypeKey, SavedProjectType } from '@/types'
import './NewProjectDialog.scss'

interface TypeOptionProps {
  icon: ReactNode
  label: string
  about?: string | null
  starts?: string
  selected: boolean
  onSelect: () => void
}

function TypeOption({ icon, label, about, starts, selected, onSelect }: TypeOptionProps) {
  return (
    <Button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={classNames('ui-new_project_dialog-type', selected && 'ui-new_project_dialog-type--selected')}
    >
      <span className="ui-new_project_dialog-type_icon" aria-hidden="true">{icon}</span>
      <span className="ui-new_project_dialog-type_text">
        <span className="ui-new_project_dialog-type_name">{label}</span>
        {about && <span className="ui-new_project_dialog-type_about">{about}</span>}
        {starts && <span className="ui-new_project_dialog-type_about">Starts with {starts}</span>}
      </span>
    </Button>
  )
}

// Asks for a name and a type, then makes the project with what the type starts it
// with (documents, Collections and tasks). Mount it to open it; it closes itself
// once the project exists. The Space's saved types are listed after the built-in
// ones and can be deleted here.
export default function NewProjectDialog({ onClose, onCreated }: { onClose: () => void; onCreated?: (project: Folder) => void }) {
  const createProject = useCreateProject()
  const { data: saved = [] } = useProjectTypes()
  const deleteType = useDeleteProjectType()
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectTypeKey>(BLANK_TYPE)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState<SavedProjectType | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || createProject.isPending) return
    setError('')
    createProject.mutate({ name: trimmed, start: projectStart(type) }, {
      onSuccess: (project) => { onCreated?.(project); onClose() },
      onError: (err) => setError(errorMessage(err)),
    })
  }

  function remove(savedType: SavedProjectType) {
    setError('')
    deleteType.mutate(savedType.id, {
      onSuccess: () => { setRemoving(null); if (type === savedType.key) setType(BLANK_TYPE) },
      onError: (err) => setError(errorMessage(err)),
    })
  }

  return (
    <Modal open title="New project" description="Choose a type to start with its documents and tasks." onClose={onClose} className="ui-new_project_dialog">
      <form onSubmit={submit} className="ui-new_project_dialog-form">
        <Input aria-label="Project name" placeholder="Project name" value={name} autoFocus onChange={(e) => setName(e.target.value)} />

        <div role="radiogroup" aria-label="Project type" className="ui-new_project_dialog-types">
          {PROJECT_TYPES.map((t) => (
            <TypeOption
              key={t.key}
              icon={t.icon || <FolderKanban className="ui-new_project_dialog-blank_icon" />}
              label={t.label}
              about={t.description}
              selected={type === t.key}
              onSelect={() => setType(t.key)}
            />
          ))}
        </div>

        {saved.length > 0 && (
          <>
            <h3 className="ui-new_project_dialog-heading">Your types</h3>
            <div role="radiogroup" aria-label="Your project types" className="ui-new_project_dialog-types">
              {saved.map((t) => (
                <div key={t.id} className="ui-new_project_dialog-saved">
                  {removing?.id === t.id ? (
                    <div role="group" aria-label={`Delete ${t.name}?`} className="ui-new_project_dialog-confirm">
                      <span>Delete {t.name}? Projects made from it keep everything in them.</span>
                      <span className="ui-new_project_dialog-confirm_actions">
                        <Button type="button" variant="secondary" onClick={() => setRemoving(null)}>Keep</Button>
                        <Button type="button" variant="destructive" disabled={deleteType.isPending} onClick={() => remove(t)}>Delete</Button>
                      </span>
                    </div>
                  ) : (
                    <>
                      <TypeOption
                        icon={t.icon || <FolderKanban className="ui-new_project_dialog-blank_icon" />}
                        label={t.name}
                        about={t.description}
                        starts={describeStart(t.starts_with)}
                        selected={type === t.key}
                        onSelect={() => setType(t.key)}
                      />
                      <Button type="button" aria-label={`Delete ${t.name}`} title="Delete this type" onClick={() => setRemoving(t)} className="ui-new_project_dialog-delete">
                        <Trash2 aria-hidden="true" className="ui-new_project_dialog-delete_icon" />
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <FormError message={error} />

        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || createProject.isPending}>
            {createProject.isPending ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
