import { useRef, useState } from 'react'
import { ImagePlus } from 'lucide-react'
import { Button, FormError, Input, Modal, classNames } from '@/components/ui'
import { useUpdateFolder } from '@/api/folders'
import { uploadFile } from '@/api/uploads'
import { errorMessage } from '@/api/tables'
import { PROJECT_EMOJIS } from '@/data/project'
import type { Folder } from '@/types'
import ProjectIcon from './ProjectIcon'
import './ProjectIconDialog.scss'

// Choose a project's emoji, upload an image for it, or clear both.
export default function ProjectIconDialog({ project, onClose }: { project: Folder | null; onClose: () => void }) {
  const updateFolder = useUpdateFolder()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function save(changes: { icon?: string | null; image_url?: string | null }) {
    if (!project) return
    setError('')
    updateFolder.mutate({ id: project.id, ...changes }, { onSuccess: onClose, onError: (e) => setError(errorMessage(e)) })
  }

  async function upload(file: File | undefined) {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const { url } = await uploadFile(file)
      save({ image_url: url })
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal open={project !== null} title={`Icon for ${project?.name ?? 'project'}`} onClose={onClose}>
      {project && (
        <div className="ui-project_icon_dialog">
          <div className="ui-project_icon_dialog-current">
            <ProjectIcon project={project} size="lg" />
            <span>{project.image_url ? 'Image' : project.icon ? 'Emoji' : 'Default icon'}</span>
          </div>

          <div className="ui-project_icon_dialog-emojis" role="group" aria-label="Emojis">
            {PROJECT_EMOJIS.map((emoji) => (
              <Button
                key={emoji}
                aria-label={emoji}
                aria-pressed={!project.image_url && project.icon === emoji}
                onClick={() => save({ icon: emoji, image_url: null })}
                className={classNames('ui-project_icon_dialog-emoji', !project.image_url && project.icon === emoji && 'ui-project_icon_dialog-emoji--active')}
              >
                {emoji}
              </Button>
            ))}
          </div>

          <label className="ui-project_icon_dialog-field">
            Or type any emoji
            <Input
              maxLength={16}
              placeholder="🙂"
              onKeyDown={(e) => {
                const value = e.currentTarget.value.trim()
                if (e.key === 'Enter' && value) save({ icon: value, image_url: null })
              }}
            />
          </label>

          <FormError message={error} />

          <div className="ui-project_icon_dialog-actions">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = '' }}
            />
            <Button variant="secondary" disabled={uploading} onClick={() => fileRef.current?.click()} className="ui-project_icon_dialog-upload">
              <ImagePlus aria-hidden="true" className="ui-project_icon_dialog-button_icon" />
              {uploading ? 'Uploading…' : 'Upload image'}
            </Button>
            {(project.icon || project.image_url) && (
              <Button onClick={() => save({ icon: null, image_url: null })}>Remove icon</Button>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
