import { useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { AttachmentCard, Button, FormError, Input, Modal, Select } from '@/components/ui'
import { useAttachTaskFile, useDetachTaskFile } from '@/api/tasks'
import { useUploadFiles, useWorkspace } from '@/api/workspace'
import { canWriteWorkspace } from '@/api/workspaces'
import { uploadedFiles } from '@/data/folder'
import { taskFileSplit, taskUploadFolderId } from '@/data/task'
import { errorMessage } from '@/util/errorMessage'
import type { Task } from '@/types'
import './TaskFiles.scss'

// The uploaded files attached to a task: preview, download and detach them,
// attach a file already in the Space, or upload new ones and attach them.
// Attaching only links the file; detaching never deletes it. Viewers can look
// and download but not change.
export function TaskFiles({ task, onClose }: { task: Task; onClose: () => void }) {
  const { data: workspace } = useWorkspace()
  const attach = useAttachTaskFile()
  const detach = useDetachTaskFile()
  const upload = useUploadFiles()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const canWrite = canWriteWorkspace(workspace?.role)
  const { attached, available } = taskFileSplit(task, uploadedFiles(workspace?.folders ?? []))
  const base = api.defaults.baseURL ?? ''
  const busy = uploading || attach.isPending || detach.isPending

  function fail(e: unknown) { setError(errorMessage(e)) }

  async function uploadAndAttach(picked: File[]) {
    const folderId = taskUploadFolderId(task, workspace?.root_folder_id)
    if (!folderId || picked.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const created = await upload.mutateAsync({ folderId, files: picked })
      for (const file of created) await attach.mutateAsync({ taskId: task.id, fileId: file.id })
    } catch (e) { fail(e) } finally { setUploading(false) }
  }

  return (
    <Modal open title={`Files: ${task.title}`} description="Uploaded files attached to this task." onClose={onClose}>
      <div className="task_files">
        {attached.length === 0 && <p className="task_files-empty">No files attached yet.</p>}
        {attached.map((file) => (
          <AttachmentCard
            key={file.id}
            name={file.title}
            url={file.file ? `${base}${file.file.url}` : null}
            type={file.file?.content_type}
            size={file.file?.byte_size}
            removeLabel="Detach"
            onRemove={canWrite ? () => detach.mutate({ taskId: task.id, fileId: file.id }, { onError: fail }) : undefined}
          />
        ))}
        {canWrite && (
          <div className="task_files-add">
            {available.length > 0 && (
              <Select
                aria-label="Attach a file from this Space"
                value=""
                disabled={busy}
                onChange={(e) => {
                  if (!e.target.value) return
                  setError(null)
                  attach.mutate({ taskId: task.id, fileId: Number(e.target.value) }, { onError: fail })
                }}
              >
                <option value="">Attach a file from this Space…</option>
                {available.map((file) => <option key={file.id} value={file.id}>{file.title}</option>)}
              </Select>
            )}
            <Button variant="secondary" disabled={busy} onClick={() => input.current?.click()}>
              {uploading && <Loader2 className="task_files-spinner" aria-hidden="true" />}
              {uploading ? 'Uploading…' : 'Upload and attach'}
            </Button>
            <Input
              ref={input}
              type="file"
              multiple
              hidden
              aria-label="Choose files to upload and attach"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? [])
                e.target.value = ''
                uploadAndAttach(picked)
              }}
            />
          </div>
        )}
        <FormError message={error} />
        <div className="ui-modal-actions">
          <Button type="button" variant="primary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  )
}
