import { useState } from 'react'
import { FormError, Select } from '@/components/ui'
import { useUpdateDocument } from '@/api/documents'
import { useEpics } from '@/api/epics'
import { useMilestones } from '@/api/milestones'
import { useWorkspace } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaces'
import { errorMessage } from '@/util/errorMessage'
import { FEATURE_STATUS_LABEL, isFeatureDocument, parentFeatureOptions } from '@/data/feature'
import { useWorkspaceStore } from '@/store/workspaces'
import type { Document, FeatureStatus } from '@/types'
import './FeatureBar.scss'

// For a document in a feature folder: where the feature sits (parent feature,
// epic, milestone), who owns it, and its status (Auto works it out from the tasks).
export default function FeatureBar({ doc }: { doc: Document }) {
  const { data: workspace } = useWorkspace()
  const { data: epics = [] } = useEpics()
  const { data: milestones = [] } = useMilestones()
  const workspaceId = useWorkspaceStore((s) => s.activeWorkspaceId) ?? 0
  const { data: members = [] } = useWorkspaceMembers(workspaceId)
  const update = useUpdateDocument()
  const [error, setError] = useState<string | null>(null)
  const folders = workspace?.folders ?? []
  if (!isFeatureDocument(folders, doc) || doc.doc_type !== 'document') return null

  const save = (data: Partial<Pick<Document, 'parent_feature_id' | 'feature_status' | 'feature_owner_id' | 'epic_id' | 'milestone_id'>>) => {
    setError(null)
    update.mutate({ id: doc.id, ...data }, { onError: (e) => setError(errorMessage(e)) })
  }
  const idOrNull = (value: string) => (value ? Number(value) : null)

  return (
    <div className="feature_bar" role="group" aria-label="Feature details">
      <Select aria-label="Parent feature" value={doc.parent_feature_id ?? ''} onChange={(e) => save({ parent_feature_id: idOrNull(e.target.value) })}>
        <option value="">No parent feature</option>
        {parentFeatureOptions(folders, doc.id).map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
      </Select>
      <Select aria-label="Feature status" value={doc.feature_status ?? ''} onChange={(e) => save({ feature_status: (e.target.value || null) as FeatureStatus | null })}>
        <option value="">Status: automatic</option>
        {(Object.keys(FEATURE_STATUS_LABEL) as FeatureStatus[]).map((s) => <option key={s} value={s}>{FEATURE_STATUS_LABEL[s]}</option>)}
      </Select>
      <Select aria-label="Feature owner" value={doc.feature_owner_id ?? ''} onChange={(e) => save({ feature_owner_id: idOrNull(e.target.value) })}>
        <option value="">No owner</option>
        {members.map((m) => <option key={m.user_id} value={m.user_id}>{m.user.name}</option>)}
      </Select>
      <Select aria-label="Feature epic" value={doc.epic_id ?? ''} onChange={(e) => save({ epic_id: idOrNull(e.target.value) })}>
        <option value="">No epic</option>
        {epics.map((epic) => <option key={epic.id} value={epic.id}>{epic.title}</option>)}
      </Select>
      <Select aria-label="Feature milestone" value={doc.milestone_id ?? ''} onChange={(e) => save({ milestone_id: idOrNull(e.target.value) })}>
        <option value="">No milestone</option>
        {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
      </Select>
      <FormError message={error} />
    </div>
  )
}
