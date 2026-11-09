import { useState, type FormEvent } from 'react'
import { Button, FormError, Input, Modal } from '@/components/ui'
import { useSaveProjectType } from '@/api/projectTypes'
import { errorMessage } from '@/util/errorMessage'
import type { Folder } from '@/types'

// Saves a project as a type of the Space, which is how a project becomes a
// reusable template: new projects of the type start with the folders, documents,
// sheets, Collection fields and task titles that are in it now (never people,
// files, records or dates; see ProjectTemplate in the backend). Mount it to open
// it; it closes itself once the type is saved.
export default function SaveProjectTypeDialog({ project, onClose }: { project: Folder; onClose: () => void }) {
  const save = useSaveProjectType()
  const [name, setName] = useState(project.name)
  const [error, setError] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || save.isPending) return
    setError('')
    save.mutate({ name: trimmed, from_folder_id: project.id }, { onSuccess: onClose, onError: (err) => setError(errorMessage(err)) })
  }

  return (
    <Modal
      open
      title="Save as project type"
      description={`Makes ${project.name} a reusable template. New projects of this type start with the folders, documents, sheets, Collection fields and tasks that are in it now. People, files, records and dates are not copied.`}
      onClose={onClose}
    >
      <form onSubmit={submit} className="ui-modal-form">
        <Input aria-label="Type name" placeholder="Type name" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
        <FormError message={error} />
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || save.isPending}>
            {save.isPending ? 'Saving…' : 'Save type'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
