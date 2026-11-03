import { useState, type FormEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { Button, Input, Select, Modal } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { canManageWorkspace, WORKSPACE_ROLES } from '@/api/workspaces'
import { useAddMember, useRemoveMember, useUpdateMemberRole, useWorkspaceMembers } from '@/api/workspaceMembers'
import { isTeamOnly, viaTeamsLabel } from '@/data/workspaceMember'
import type { TeamOnlyMember, WorkspaceRole, WorkspaceSummary } from '@/types'
import './WorkspaceMembers.scss'

// A person's name and email, and what follows them (who gives them access).
function Person({ name, email, children }: { name: string; email: string; children?: ReactNode }) {
  return (
    <div className="workspace_members-person">
      <p className="workspace_members-name">{name}</p>
      <p className="workspace_members-email">{email}</p>
      {children}
    </div>
  )
}

// The teams that give a team-only person their access. A button that opens
// the Teams dialog when the caller can show it, plain text otherwise.
function ViaTeams({ person, onOpenTeams }: { person: TeamOnlyMember; onOpenTeams?: () => void }) {
  const label = viaTeamsLabel(person)
  if (!onOpenTeams) return <p className="workspace_members-via">{label}</p>
  return (
    <Button variant="ghost" className="workspace_members-via workspace_members-via--link" title="Open Teams" aria-haspopup="dialog" onClick={onOpenTeams}>
      {label}
    </Button>
  )
}

// People in a space and their roles. Admins and owners add (by the email
// of an existing user), change roles and remove; anyone can leave. People
// who are only on a team come last, read-only with the teams that give them
// access (change them in the Teams dialog, opened by onOpenTeams).
export function WorkspaceMembers({ workspace, open, onClose, onOpenTeams }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void; onOpenTeams?: () => void }) {
  const me = useAuthStore((s) => s.user)
  const { data: members = [] } = useWorkspaceMembers(workspace.id)
  const addMember = useAddMember(workspace.id)
  const updateRole = useUpdateMemberRole(workspace.id)
  const removeMember = useRemoveMember(workspace.id)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const canManage = canManageWorkspace(workspace.role) && !workspace.personal
  // Only an owner can hand out (or change) the owner role.
  const assignable = WORKSPACE_ROLES.filter((r) => r !== 'owner' || workspace.role === 'owner')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    addMember.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') })
  }

  return (
    <Modal open={open} title={`Members of ${workspace.name}`} onClose={onClose}>
      <ul className="workspace_members-list">
        {members.map((m) => {
          const isMe = m.user_id === me?.id
          const name = `${m.user.name}${isMe ? ' (you)' : ''}`
          if (isTeamOnly(m)) {
            return (
              <li key={`team-${m.user_id}`} className="workspace_members-row">
                <Person name={name} email={m.user.email}>
                  <ViaTeams person={m} onOpenTeams={onOpenTeams} />
                </Person>
                <span className="workspace_members-role">{m.role}</span>
              </li>
            )
          }
          const locked = !canManage || (m.role === 'owner' && workspace.role !== 'owner')
          return (
            <li key={m.id} className="workspace_members-row">
              <Person name={name} email={m.user.email} />
              {locked ? (
                <span className="workspace_members-role">{m.role}</span>
              ) : (
                <Select
                  aria-label={`Role for ${m.user.name}`}
                  className="workspace_members-select"
                  value={m.role}
                  onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value as WorkspaceRole })}
                >
                  {assignable.map((r) => <option key={r} value={r}>{r}</option>)}
                </Select>
              )}
              {(isMe ? !workspace.personal : !locked) && (
                <Button
                  variant="ghost"
                  aria-label={isMe ? 'Leave space' : `Remove ${m.user.name}`}
                  title={isMe ? 'Leave space' : 'Remove'}
                  onClick={() => removeMember.mutate(m.id, { onSuccess: () => { if (isMe) onClose() } })}
                >
                  <X className="workspace_members-icon" />
                </Button>
              )}
            </li>
          )
        })}
      </ul>

      {canManage && (
        <form onSubmit={submit} className="workspace_members-add">
          <Input type="email" aria-label="Email of an existing user" placeholder="Email of an existing user" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select aria-label="Role for the new member" value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
            {assignable.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Button type="submit" variant="primary" disabled={addMember.isPending}>Add</Button>
        </form>
      )}
      {workspace.personal && <p className="workspace_members-hint">A personal space can&apos;t be shared. Create a space to work with others.</p>}

      <div className="workspace_members-footer">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
