import { useState, type ReactNode } from 'react'
import { ChevronsUpDown, Plus, SlidersHorizontal, Users, UsersRound } from 'lucide-react'
import { Menu, type MenuItem } from '@/components/ui'
import { useWorkspace } from '@/api/workspace'
import { useCreateWorkspace, useWorkspaces, type NewWorkspace } from '@/api/workspaces'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import type { WorkspaceSummary } from '@/types'
import { WorkspaceMembers } from './WorkspaceMembers'
import { WorkspaceTeams } from './WorkspaceTeams'
import { WorkspaceFeatures } from './WorkspaceFeatures'
import { NewWorkspaceDialog } from './NewWorkspaceDialog'
import './WorkspaceSwitcher.scss'

// The sidebar header's Space name, which opens a dropdown menu to switch
// between Spaces (projects with their own people), create one, manage members
// and teams, or choose which pages the Space uses. children (a logo) lead the
// button, so the whole block is one click target. The open project's switcher
// (ProjectNav) shares its styles.
export function WorkspaceSwitcher({ children }: { children?: ReactNode }) {
  const switchWorkspace = useSwitchWorkspace()
  const { data: current } = useWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const [creating, setCreating] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)
  const [featuresOpen, setFeaturesOpen] = useState(false)

  function switchTo(workspace: WorkspaceSummary) {
    if (workspace.id !== current?.id) switchWorkspace(workspace)
  }

  function create(input: NewWorkspace) {
    createWorkspace.mutate(input, { onSuccess: switchTo })
  }

  const items: MenuItem[] = [
    ...workspaces.map((w) => ({
      key: `space-${w.id}`,
      label: w.name,
      hint: w.personal ? 'personal' : (w.role ?? undefined),
      checked: w.id === current?.id,
      onSelect: () => switchTo(w),
    })),
    { key: 'new', label: 'New Space...', icon: <Plus className="workspace_switcher-icon" aria-hidden="true" />, separatorBefore: true, onSelect: () => setCreating(true) },
    ...(current ? [{ key: 'members', label: 'Members...', icon: <Users className="workspace_switcher-icon" aria-hidden="true" />, onSelect: () => setMembersOpen(true) }] : []),
    ...(current ? [{ key: 'features', label: 'Features...', icon: <SlidersHorizontal className="workspace_switcher-icon" aria-hidden="true" />, onSelect: () => setFeaturesOpen(true) }] : []),
    ...(current && !current.personal ? [{ key: 'teams', label: 'Teams...', icon: <UsersRound className="workspace_switcher-icon" aria-hidden="true" />, onSelect: () => setTeamsOpen(true) }] : []),
  ]

  return (
    <>
      <Menu label={`Space: ${current?.name ?? 'My Space'}. Switch Space`} triggerClassName="workspace_switcher-trigger" items={items}>
        {children}
        <span className="workspace_switcher-text">
          <span className="workspace_switcher-name">{current?.name ?? 'My Space'}</span>
        </span>
        <ChevronsUpDown className="workspace_switcher-icon" aria-hidden="true" />
      </Menu>

      <NewWorkspaceDialog open={creating} onSubmit={create} onClose={() => setCreating(false)} />
      {current && <WorkspaceFeatures workspace={current} open={featuresOpen} onClose={() => setFeaturesOpen(false)} />}
      {current && <WorkspaceMembers workspace={current} open={membersOpen} onClose={() => setMembersOpen(false)} />}
      {current && !current.personal && <WorkspaceTeams workspace={current} open={teamsOpen} onClose={() => setTeamsOpen(false)} />}
    </>
  )
}
