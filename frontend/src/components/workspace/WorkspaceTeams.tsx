import { useState, type FormEvent } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input, Modal, PromptDialog, Select } from '@/components/ui'
import { canManageWorkspace } from '@/api/workspaces'
import { useAddTeamMember, useCreateTeam, useDeleteTeam, useRemoveTeamMember, useTeams, useUpdateTeam } from '@/api/teams'
import { TEAM_ROLES, TEAM_ROLE_HELP, normalizeTeamName, sortTeams, teamNameTaken, teamPeopleLabel, type Team, type TeamRole } from '@/data/team'
import type { WorkspaceSummary } from '@/types'
import './WorkspaceTeams.scss'

// One team: its role in the Space, the people on it, and (for admins and
// owners) renaming, deleting and adding or removing people. Failed requests
// show an error notice through the shared API client.
function WorkspaceTeam({ team, workspaceId, canManage }: { team: Team; workspaceId: number; canManage: boolean }) {
  const updateTeam = useUpdateTeam(workspaceId)
  const deleteTeam = useDeleteTeam(workspaceId)
  const addMember = useAddTeamMember(workspaceId)
  const removeMember = useRemoveTeamMember(workspaceId)
  const [email, setEmail] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const nameId = `workspace_teams-name-${team.id}`

  function add(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    addMember.mutate({ teamId: team.id, email: address }, { onSuccess: () => setEmail('') })
  }

  function rename(next: string) {
    const name = normalizeTeamName(next)
    if (name && name !== team.name) updateTeam.mutate({ id: team.id, name })
  }

  return (
    <li className="workspace_teams-team" aria-labelledby={nameId}>
      <div className="workspace_teams-head">
        <div className="workspace_teams-title">
          <h3 id={nameId} className="workspace_teams-name">{team.name}</h3>
          <p className="workspace_teams-count">{teamPeopleLabel(team)}</p>
        </div>
        {canManage ? (
          <div className="workspace_teams-controls">
            <Select
              aria-label={`Role of ${team.name}`}
              className="workspace_teams-select"
              value={team.role}
              onChange={(e) => updateTeam.mutate({ id: team.id, role: e.target.value as TeamRole })}
            >
              {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </Select>
            <Button variant="ghost" className="workspace_teams-icon_button" aria-label={`Rename ${team.name}`} title="Rename" onClick={() => setRenaming(true)}>
              <Pencil className="workspace_teams-icon" />
            </Button>
            <Button variant="ghost" className="workspace_teams-icon_button" aria-label={`Delete ${team.name}`} title="Delete team" onClick={() => setDeleting(true)}>
              <Trash2 className="workspace_teams-icon" />
            </Button>
          </div>
        ) : (
          <span className="workspace_teams-role">{team.role}</span>
        )}
      </div>
      <p className="workspace_teams-help">{TEAM_ROLE_HELP[team.role]}</p>

      {team.members.length > 0 && (
        <ul className="workspace_teams-people">
          {team.members.map((m) => (
            <li key={m.id} className="workspace_teams-person">
              <div className="workspace_teams-who">
                <p className="workspace_teams-person_name">{m.user.name}</p>
                <p className="workspace_teams-person_email">{m.user.email}</p>
              </div>
              {canManage && (
                <Button
                  variant="ghost"
                  className="workspace_teams-icon_button"
                  aria-label={`Remove ${m.user.name} from ${team.name}`}
                  title="Remove from team"
                  onClick={() => removeMember.mutate({ teamId: team.id, membershipId: m.id })}
                >
                  <X className="workspace_teams-icon" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={add} className="workspace_teams-add">
          <Input type="email" aria-label={`Email to add to ${team.name}`} placeholder="Email of an existing user" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" variant="secondary" disabled={addMember.isPending}>Add</Button>
        </form>
      )}

      <PromptDialog open={renaming} title="Rename team" label="Team name" initialValue={team.name} onSubmit={rename} onClose={() => setRenaming(false)} />
      <ConfirmDialog
        open={deleting}
        title={`Delete ${team.name}?`}
        description="Everyone on this team loses the access it gave them. Access they have through their own membership stays."
        confirmLabel="Delete team"
        destructive
        onConfirm={() => deleteTeam.mutate(team.id)}
        onClose={() => setDeleting(false)}
      />
    </li>
  )
}

// Teams in a Space: groups of people that hold one role there together. Anyone
// in the Space can read them; admins and owners create and change them. Personal
// Spaces cannot be shared, so they have no teams.
export function WorkspaceTeams({ workspace, open, onClose }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void }) {
  const { data: teams = [] } = useTeams(workspace.id, open)
  const createTeam = useCreateTeam(workspace.id)
  const [name, setName] = useState('')
  const [role, setRole] = useState<TeamRole>('member')
  const canManage = canManageWorkspace(workspace.role) && !workspace.personal
  const taken = teamNameTaken(teams, name)

  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = normalizeTeamName(name)
    if (!clean || taken) return
    createTeam.mutate({ name: clean, role }, { onSuccess: () => setName('') })
  }

  return (
    <Modal open={open} title={`Teams in ${workspace.name}`} description="A team gives everyone on it one role in this Space." onClose={onClose}>
      {teams.length === 0 ? (
        <p className="workspace_teams-empty">No teams yet.</p>
      ) : (
        <ul className="workspace_teams-list">
          {sortTeams(teams).map((team) => (
            <WorkspaceTeam key={team.id} team={team} workspaceId={workspace.id} canManage={canManage} />
          ))}
        </ul>
      )}

      {canManage && (
        <form onSubmit={submit} className="workspace_teams-create">
          <Input aria-label="New team name" placeholder="New team, e.g. Design" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <Select aria-label="Role for the new team" value={role} onChange={(e) => setRole(e.target.value as TeamRole)}>
            {TEAM_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Button type="submit" variant="primary" disabled={createTeam.isPending || taken}>Create team</Button>
        </form>
      )}
      <FormError className="workspace_teams-error" message={taken ? 'A team with that name already exists.' : null} />

      <div className="workspace_teams-footer">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
