import { useState, type FormEvent } from 'react'
import { Copy, X } from 'lucide-react'
import { Button, Input, Select, Modal } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { canManageWorkspace, useAddMember, useCreateInvitation, useRevokeInvitation, useWorkspaceInvitations, useRemoveMember, useUpdateMemberRole, useWorkspaceMembers, WORKSPACE_ROLES } from '@/api/workspaces'
import { inviteLink } from '@/data/invitation'
import type { WorkspaceRole, WorkspaceSummary } from '@/types'
import './WorkspaceMembers.scss'

// People in a space and their roles. Admins and owners add (by the email
// of an existing user, or by an invite link for someone without an account),
// change roles and remove; anyone can leave.
export function WorkspaceMembers({ workspace, open, onClose }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void }) {
  const me = useAuthStore((s) => s.user)
  const { data: members = [] } = useWorkspaceMembers(workspace.id)
  const addMember = useAddMember(workspace.id)
  const updateRole = useUpdateMemberRole(workspace.id)
  const removeMember = useRemoveMember(workspace.id)
  const createInvitation = useCreateInvitation(workspace.id)
  const revokeInvitation = useRevokeInvitation(workspace.id)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<WorkspaceRole>('member')
  const canManage = canManageWorkspace(workspace.role) && !workspace.personal
  // Only an owner can hand out (or change) the owner role.
  const assignable = WORKSPACE_ROLES.filter((r) => r !== 'owner' || workspace.role === 'owner')
  const { data: invitations = [] } = useWorkspaceInvitations(workspace.id, canManage && open)
  const [copied, setCopied] = useState<number | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    addMember.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') })
  }

  // No email is sent: the link is copied for the inviter to pass on.
  function invite() {
    if (!email.trim()) return
    createInvitation.mutate({ email: email.trim(), role }, { onSuccess: () => setEmail('') })
  }

  function copyLink(id: number, token: string) {
    navigator.clipboard.writeText(inviteLink(window.location.origin, token)).then(() => setCopied(id))
  }

  return (
    <Modal open={open} title={`Members of ${workspace.name}`} onClose={onClose}>
      <ul className="workspace_members-list">
        {members.map((m) => {
          const isMe = m.user_id === me?.id
          const locked = !canManage || (m.role === 'owner' && workspace.role !== 'owner')
          return (
            <li key={m.id} className="workspace_members-row">
              <div className="workspace_members-person">
                <p className="workspace_members-name">{m.user.name}{isMe ? ' (you)' : ''}</p>
                <p className="workspace_members-email">{m.user.email}</p>
              </div>
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
          <Input type="email" aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select aria-label="Role for the new member" value={role} onChange={(e) => setRole(e.target.value as WorkspaceRole)}>
            {assignable.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
          <Button type="submit" variant="primary" disabled={addMember.isPending}>Add</Button>
          <Button type="button" variant="secondary" onClick={invite} disabled={createInvitation.isPending}>Invite by link</Button>
        </form>
      )}
      {canManage && invitations.length > 0 && (
        <>
          <h3 className="workspace_members-subheading">Pending invitations</h3>
          <ul className="workspace_members-list">
            {invitations.map((i) => (
              <li key={i.id} className="workspace_members-row">
                <div className="workspace_members-person">
                  <p className="workspace_members-name">{i.email}</p>
                  <p className="workspace_members-email">{i.role}</p>
                </div>
                <Button variant="ghost" aria-label={`Copy invite link for ${i.email}`} title="Copy invite link" onClick={() => copyLink(i.id, i.token)}>
                  <Copy className="workspace_members-icon" />
                  {copied === i.id && <span className="workspace_members-copied">Copied</span>}
                </Button>
                <Button variant="ghost" aria-label={`Revoke invitation for ${i.email}`} title="Revoke" onClick={() => revokeInvitation.mutate(i.id)}>
                  <X className="workspace_members-icon" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="workspace_members-hint">No email is sent. Copy the link and send it; they must sign in or sign up with the invited email.</p>
        </>
      )}
      {workspace.personal && <p className="workspace_members-hint">A personal space can&apos;t be shared. Create a space to work with others.</p>}

      <div className="workspace_members-footer">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
