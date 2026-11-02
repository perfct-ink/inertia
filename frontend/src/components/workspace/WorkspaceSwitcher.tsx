import { useState } from 'react'
import { ChevronsUpDown, Plus, Users, UsersRound } from 'lucide-react'
import { Menu, PromptDialog, type MenuItem } from '@/components/ui'
import { useWorkspace } from '@/api/workspace'
import { useCreateWorkspace, useWorkspaces } from '@/api/workspaces'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import type { WorkspaceSummary } from '@/types'
import { WorkspaceMembers } from './WorkspaceMembers'
import { WorkspaceTeams } from './WorkspaceTeams'
import './WorkspaceSwitcher.scss'

// The sidebar header's Space name, which opens a dropdown menu to switch
// between Spaces (projects with their own people), create one, or manage members
// and teams.
export function WorkspaceSwitcher() {
  const switchWorkspace = useSwitchWorkspace()
  const { data: current } = useWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const createWorkspace = useCreateWorkspace()
  const [creating, setCreating] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [teamsOpen, setTeamsOpen] = useState(false)

  function switchTo(workspace: WorkspaceSummary) {
    if (workspace.id !== current?.id) switchWorkspace(workspace)
  }

  function create(name: string) {
    if (!name) return
    createWorkspace.mutate(name, { onSuccess: switchTo })
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
    ...(current && !current.personal ? [{ key: 'teams', label: 'Teams...', icon: <UsersRound className="workspace_switcher-icon" aria-hidden="true" />, onSelect: () => setTeamsOpen(true) }] : []),
  ]

  return (
    <>
      <Menu label={`Space: ${current?.name ?? 'My Space'}. Switch Space`} triggerClassName="workspace_switcher-trigger" items={items}>
        <span className="workspace_switcher-name">{current?.name ?? 'My Space'}</span>
        <ChevronsUpDown className="workspace_switcher-icon" aria-hidden="true" />
      </Menu>

      <PromptDialog open={creating} title="New Space" label="Space name" placeholder="e.g. Website relaunch" submitLabel="Create" onSubmit={create} onClose={() => setCreating(false)} />
      {current && <WorkspaceMembers workspace={current} open={membersOpen} onClose={() => setMembersOpen(false)} />}
      {current && !current.personal && <WorkspaceTeams workspace={current} open={teamsOpen} onClose={() => setTeamsOpen(false)} />}
    </>
  )
}
