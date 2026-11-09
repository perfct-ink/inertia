import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Users } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import { useLeaveFolder, useSharedFolders } from '@/api/folderMembers'
import { sharedEntryFor, sharedNotice } from '@/data/folderRole'
import { FolderMembers } from './FolderMembers'
import './FolderSharing.scss'

// The Share button of a folder page: opens the list of people invited to the
// folder. The page only shows it to people who can manage sharing.
export function ShareFolderButton({ folder }: { folder: { id: number; name: string } }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="secondary" className="folder_sharing-button" title="Invite people to this folder" onClick={() => setOpen(true)}>
        <Users className="folder_sharing-icon" />
        Share
      </Button>
      <FolderMembers folder={folder} open={open} onClose={() => setOpen(false)} />
    </>
  )
}

// On a folder someone invited you to (you are not in its Space): who shared it
// with you and your role, and a way to leave. Failed requests show an error
// notice through the shared API client.
export function SharedFolderBanner({ folderId }: { folderId: number }) {
  const navigate = useNavigate()
  const { data: shared = [] } = useSharedFolders()
  const leave = useLeaveFolder()
  const [confirming, setConfirming] = useState(false)
  const entry = sharedEntryFor(shared, folderId)
  if (!entry) return null

  return (
    <div className="folder_sharing-banner" role="status">
      <p className="folder_sharing-notice">{sharedNotice(entry)}</p>
      <Button variant="secondary" className="folder_sharing-button" onClick={() => setConfirming(true)}>
        <LogOut className="folder_sharing-icon" />
        Leave
      </Button>
      <ConfirmDialog
        open={confirming}
        title={`Leave ${entry.folder.name}?`}
        description="You will no longer see this folder or anything in it, until someone invites you again."
        confirmLabel="Leave folder"
        destructive
        onConfirm={() => leave.mutate({ folderId: entry.folder_id, id: entry.id }, { onSuccess: () => navigate('/space') })}
        onClose={() => setConfirming(false)}
      />
    </div>
  )
}
