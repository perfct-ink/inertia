import { useState } from 'react'
import { Check, ChevronsUpDown, Plus, SlidersHorizontal, Users } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { useWorkspace } from '@/api/workspace'
import { useCreateWorkspace, useWorkspaces } from '@/api/workspaces'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import type { WorkspaceSummary } from '@/types'
import { WorkspaceMembers } from './WorkspaceMembers'
import { WorkspaceFeatures } from './WorkspaceFeatures'
import { NewWorkspaceDialog } from './NewWorkspaceDialog'
import './WorkspaceSwitcher.scss'

// The sidebar header's workspace name, which opens a list to switch between
// workspaces (projects with their own people), create one, or manage members.
export function WorkspaceSwitcher() {
  const switchWorkspace = useSwitchWorkspace()
  const { data: current } = useWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const [listOpen, setListOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)

  function switchTo(workspace: WorkspaceSummary) {
    setListOpen(false)
    if (workspace.id !== current?.id) switchWorkspace(workspace)
  }

  function create(input: { name: string; features: string[] }) {
    setCreating(false)
    createWorkspace.mutate(input, { onSuccess: switchTo })
  }

  return (
    <>
      <Button
        variant="unstyled"
        className="workspace_switcher-trigger"
        aria-label={`Space: ${current?.name ?? 'My Space'}. Switch space`}
        aria-haspopup="dialog"
        onClick={() => setListOpen(true)}
      >
        <span className="workspace_switcher-name">{current?.name ?? 'My Space'}</span>
        <ChevronsUpDown className="workspace_switcher-icon" />
      </Button>

      <Modal open={listOpen} title="Spaces" description="Each space is a separate project with its own people." onClose={() => setListOpen(false)}>
        <ul className="workspace_switcher-list">
          {workspaces.map((w) => (
            <li key={w.id}>
              <Button variant="unstyled" className="workspace_switcher-item" onClick={() => switchTo(w)}>
                <span className="workspace_switcher-item_name">{w.name}</span>
                <span className="workspace_switcher-item_role">{w.personal ? 'personal' : w.role}</span>
                {w.id === current?.id && <Check className="workspace_switcher-icon" aria-label="Current space" />}
              </Button>
            </li>
          ))}
        </ul>
        <div className="workspace_switcher-actions">
          <Button variant="secondary" onClick={() => { setListOpen(false); setCreating(true) }}>
            <Plus className="workspace_switcher-icon" /> New space
          </Button>
          {current && (
            <Button variant="secondary" onClick={() => { setListOpen(false); setMembersOpen(true) }}>
              <Users className="workspace_switcher-icon" /> Members
            </Button>
          )}
          {current && (
            <Button variant="secondary" onClick={() => { setListOpen(false); setFeaturesOpen(true) }}>
              <SlidersHorizontal className="workspace_switcher-icon" /> Features
            </Button>
          )}
        </div>
      </Modal>

      <NewWorkspaceDialog open={creating} onSubmit={create} onClose={() => setCreating(false)} />
      {current && <WorkspaceFeatures workspace={current} open={featuresOpen} onClose={() => setFeaturesOpen(false)} />}
      {current && <WorkspaceMembers workspace={current} open={membersOpen} onClose={() => setMembersOpen(false)} />}
    </>
  )
}
