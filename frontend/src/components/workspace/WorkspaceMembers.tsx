import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button, Input, Select, Modal } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { canManageWorkspace, useAddMember, useRemoveMember, useUpdateMemberRole, useWorkspaceMembers, WORKSPACE_ROLES } from '@/api/workspaces'
import type { WorkspaceRole, WorkspaceSummary } from '@/types'
import './WorkspaceMembers.scss'

// People in a workspace and their roles. Admins and owners add (by the email
// of an existing user), change roles and remove; anyone can leave.
export function WorkspaceMembers({ workspace, open, onClose }: { workspace: WorkspaceSummary; open: boolean; onClose: () => void }) {
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
                  aria-label={isMe ? 'Leave workspace' : `Remove ${m.user.name}`}
                  title={isMe ? 'Leave workspace' : 'Remove'}
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
      {workspace.personal && <p className="workspace_members-hint">A personal workspace can&apos;t be shared. Create a workspace to work with others.</p>}

      <div className="workspace_members-footer">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
