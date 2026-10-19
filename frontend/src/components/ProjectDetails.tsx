import { useState } from 'react'
import { FormError, Input, Select, Textarea } from '@/components/ui'
import { useUpdateFolder } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaces'
import { errorMessage } from '@/api/tables'
import { PROJECT_STATUSES } from '@/data/project'
import { useWorkspaceStore } from '@/store/workspaces'
import type { Folder, ProjectStatus } from '@/types'
import './ProjectDetails.scss'

// Owner, status, start and end dates and a description for a project folder.
// Each change saves on its own; failures show under the fields.
export default function ProjectDetails({ project }: { project: Folder }) {
  const updateFolder = useUpdateFolder()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const [error, setError] = useState<string | null>(null)
  const save = (data: Partial<Pick<Folder, 'owner_id' | 'project_status' | 'start_date' | 'target_date' | 'description'>>) => {
    setError(null)
    updateFolder.mutate({ id: project.id, ...data }, { onError: (e) => setError(errorMessage(e)) })
  }

  return (
    <div className="project-details">
      <div className="project-details-row">
        <Select aria-label="Owner" value={project.owner_id ?? ''} onChange={(e) => save({ owner_id: e.target.value ? Number(e.target.value) : null })}>
          <option value="">No owner</option>
          {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
        </Select>
        <Select aria-label="Status" value={project.project_status ?? 'planned'} onChange={(e) => save({ project_status: e.target.value as ProjectStatus })}>
          {PROJECT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Input type="date" aria-label="Start date" value={project.start_date ?? ''} onChange={(e) => save({ start_date: e.target.value || null })} />
        <span aria-hidden="true">&rarr;</span>
        <Input type="date" aria-label="End date" value={project.target_date ?? ''} onChange={(e) => save({ target_date: e.target.value || null })} />
      </div>
      <Textarea
        key={`${project.id}-${project.description ?? ''}`}
        aria-label="Description"
        placeholder="Description"
        defaultValue={project.description ?? ''}
        onBlur={(e) => { const value = e.target.value.trim() || null; if (value !== (project.description ?? null)) save({ description: value }) }}
      />
      <FormError message={error} />
    </div>
  )
}
