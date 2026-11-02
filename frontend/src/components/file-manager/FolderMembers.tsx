import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { Button, Input, Modal, Select } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { useFolderMembers, useInviteToFolder, useRemoveFolderMember, useUpdateFolderMemberRole } from '@/api/folderMembers'
import { FOLDER_ROLES, FOLDER_ROLE_HELP, FOLDER_ROLE_LABEL, sortFolderMembers } from '@/data/folderRole'
import type { FolderRole } from '@/types'
import './FolderMembers.scss'

// The people invited to a folder, and so to every document, file, task and
// subfolder inside it. Opened only by people who can manage the folder's
// sharing (the server checks again). Failed requests show an error notice
// through the shared API client.
export function FolderMembers({ folder, open, onClose }: { folder: { id: number; name: string }; open: boolean; onClose: () => void }) {
  const me = useAuthStore((s) => s.user)
  const { data: members = [] } = useFolderMembers(folder.id, open)
  const invite = useInviteToFolder(folder.id)
  const updateRole = useUpdateFolderMemberRole(folder.id)
  const remove = useRemoveFolderMember(folder.id)
  const [email, setEmail] = useState('')
  // Least privilege first: the role a new person gets unless you pick another.
  const [role, setRole] = useState<FolderRole>('viewer')

  function submit(e: FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!address) return
    invite.mutate({ email: address, role }, { onSuccess: () => setEmail('') })
  }

  return (
    <Modal
      open={open}
      title={`Share ${folder.name}`}
      description="People you invite can open everything in this folder and the folders inside it."
      onClose={onClose}
    >
      {members.length > 0 && (
        <ul className="folder_members-list" aria-label="People with access">
          {sortFolderMembers(members).map((m) => {
            const isMe = m.user_id === me?.id
            return (
              <li key={m.id} className="folder_members-row">
                <div className="folder_members-person">
                  <p className="folder_members-name">{m.user.name}{isMe ? ' (you)' : ''}</p>
                  <p className="folder_members-email">{m.user.email}</p>
                  {m.inherited && <p className="folder_members-note">Invited to {m.folder_name}, which contains this folder</p>}
                </div>
                {m.inherited || isMe ? (
                  <span className="folder_members-role">{FOLDER_ROLE_LABEL[m.role]}</span>
                ) : (
                  <Select
                    aria-label={`Role for ${m.user.name}`}
                    className="folder_members-select"
                    value={m.role}
                    onChange={(e) => updateRole.mutate({ id: m.id, role: e.target.value as FolderRole })}
                  >
                    {FOLDER_ROLES.map((r) => <option key={r} value={r}>{FOLDER_ROLE_LABEL[r]}</option>)}
                  </Select>
                )}
                {!m.inherited && (
                  <Button
                    variant="ghost"
                    className="folder_members-icon_button"
                    aria-label={`Remove ${m.user.name}`}
                    title="Remove"
                    onClick={() => remove.mutate(m.id)}
                  >
                    <X className="folder_members-icon" />
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <form onSubmit={submit} className="folder_members-add">
        <Input type="email" aria-label="Email of an existing user" placeholder="Email of an existing user" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Select aria-label="Role for the new person" value={role} onChange={(e) => setRole(e.target.value as FolderRole)}>
          {FOLDER_ROLES.map((r) => <option key={r} value={r}>{FOLDER_ROLE_LABEL[r]}</option>)}
        </Select>
        <Button type="submit" variant="primary" disabled={invite.isPending || !email.trim()}>Invite</Button>
      </form>
      <p className="folder_members-hint">{FOLDER_ROLE_HELP[role]}</p>

      <div className="folder_members-footer">
        <Button variant="secondary" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  )
}
