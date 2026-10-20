import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, FormError, Input, Modal, Select } from '@/components/ui'
import { useTaskFiles } from '@/api/tasks'
import { useUploadFiles, useWorkspace } from '@/api/workspace'
import { errorMessage } from '@/util/errorMessage'
import { flattenFolders } from '@/data/folder'
import { formatBytes } from '@/data/document'
import type { Document, Task } from '@/types'

// The files attached to a task: open them, detach one, attach a file already in
// the Space, or upload new ones (into the Space's Root) and attach them.
export default function TaskFilesDialog({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { data: workspace } = useWorkspace()
  const { attach, detach } = useTaskFiles()
  const upload = useUploadFiles()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const files = flattenFolders(workspace?.folders ?? []).flatMap((f) => f.documents ?? []).filter((d): d is Document => d.doc_type === 'file')
  const attached = files.filter((f) => task?.file_ids?.includes(f.id))
  const available = files.filter((f) => !task?.file_ids?.includes(f.id))
  const rootId = workspace?.root_folder_id

  async function uploadAndAttach(picked: File[]) {
    if (!task || !rootId || picked.length === 0) return
    setError(null)
    try {
      const created = await upload.mutateAsync({ folderId: rootId, files: picked })
      for (const doc of created) await attach.mutateAsync({ taskId: task.id, fileId: doc.id })
    } catch (e) { setError(errorMessage(e)) }
  }

  return (
    <Modal open={task !== null} title={`Files: ${task?.title ?? ''}`} onClose={onClose}>
      <ul>
        {attached.length === 0 && <li>No files attached.</li>}
        {attached.map((f) => (
          <li key={f.id}>
            <Link to={`/documents/${f.id}`}>{f.title}</Link>{f.file ? ` · ${formatBytes(f.file.byte_size)}` : ''}
            <Button aria-label={`Detach ${f.title}`} onClick={() => task && detach.mutate({ taskId: task.id, fileId: f.id }, { onError: (e) => setError(errorMessage(e)) })}>Detach</Button>
          </li>
        ))}
      </ul>
      {available.length > 0 && (
        <Select aria-label="Attach an existing file" value="" onChange={(e) => task && e.target.value && attach.mutate({ taskId: task.id, fileId: Number(e.target.value) }, { onError: (err) => setError(errorMessage(err)) })}>
          <option value="">Attach a file from this Space…</option>
          {available.map((f) => <option key={f.id} value={f.id}>{f.title}</option>)}
        </Select>
      )}
      <Button variant="secondary" disabled={upload.isPending} onClick={() => input.current?.click()}>Upload and attach</Button>
      <Input ref={input} type="file" multiple hidden aria-label="Choose files to attach" onChange={(e) => { const picked = Array.from(e.target.files ?? []); e.target.value = ''; uploadAndAttach(picked) }} />
      <FormError message={error} />
    </Modal>
  )
}
