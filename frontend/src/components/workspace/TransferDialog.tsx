import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button, FormError, Modal, Select } from '@/components/ui'
import { useSpaceFolders, useTransfer, useAttachedRecords, type TransferResult } from '@/api/transfer'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import { useTransferTargets } from '@/hooks/useTransferTargets'
import { useTabsStore } from '@/store/tabs'
import { useTransferStore } from '@/store/transfer'
import { folderChoices } from '@/data/folder'
import {
  attachedBlocker, attachedNotice, isMovedPage, transferDone, transferPath, transferSummary, transferTitle, transferVerb, type TransferRequest,
} from '@/data/transfer'
import { errorMessage } from '@/util/errorMessage'
import type { WorkspaceSummary } from '@/types'
import './TransferDialog.scss'

interface Finished { space: WorkspaceSummary; result: TransferResult }

// Mount once (the sidebar does): shows the dialog for whatever a menu asked to
// move or copy.
export function TransferHost() {
  const request = useTransferStore((s) => s.request)
  const close = useTransferStore((s) => s.close)
  return request ? <TransferDialog request={request} onClose={close} /> : null
}

// Moves or copies a document or folder into a folder of another Space. The
// server decides what goes with it (see docs/features/space_transfer.md); this
// only picks the destination, says what will happen, and reports the result.
export function TransferDialog({ request, onClose }: { request: TransferRequest; onClose: () => void }) {
  const { mode, kind, id } = request
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const switchWorkspace = useSwitchWorkspace()
  const { targets, isLoading } = useTransferTargets()
  const transfer = useTransfer()
  const [chosenSpaceId, setChosenSpaceId] = useState<number | null>(null)
  const [chosenFolderId, setChosenFolderId] = useState<number | null>(null)
  const [finished, setFinished] = useState<Finished | null>(null)

  const space = targets.find((s) => s.id === chosenSpaceId) ?? targets[0]
  const { data: folders, isLoading: loadingFolders, isError: foldersFailed } = useSpaceFolders(space?.id ?? null)
  const choices = folderChoices(folders ?? [])
  const folderId = choices.some((c) => c.id === chosenFolderId) ? chosenFolderId : (choices[0]?.id ?? null)

  // A folder can have tasks, events and other records filed directly under it.
  // Say what happens to them before the user chooses; a move waits for the answer.
  const attached = useAttachedRecords(kind === 'folder' ? id : null)
  const notice = attached.data ? attachedNotice(mode, attached.data) : null
  const blocker = attached.data ? attachedBlocker(mode, attached.data) : null
  const awaitingAttached = kind === 'folder' && mode === 'move' && !attached.data

  // Whatever left this Space can't stay open or in a tab here.
  function leaveMovedPages() {
    useTabsStore.getState().removeTabs(request.documentIds.map(String))
    if (isMovedPage(request, pathname)) navigate('/space')
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!space || folderId == null) return
    transfer.mutate({ mode, kind, id, targetFolderId: folderId }, {
      onSuccess: (result) => {
        if (mode === 'move') leaveMovedPages()
        setFinished({ space, result })
      },
    })
  }

  function openThere() {
    if (!finished) return
    const item = finished.result.document ?? finished.result.folder
    onClose()
    switchWorkspace(finished.space)
    if (item) navigate(transferPath(kind, item.id))
  }

  const error = foldersFailed
    ? "Couldn't load that Space's folders."
    : attached.isError
      ? "Couldn't check what is filed directly under this folder."
      : transfer.isError ? errorMessage(transfer.error) : null
  const description = finished ? transferDone(request, finished.space.name) : transferSummary(request)

  return (
    <Modal open title={transferTitle(mode)} description={description} onClose={onClose}>
      {finished ? (
        <div className="ui-modal-actions transfer_dialog-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Done</Button>
          <Button type="button" variant="primary" onClick={openThere}>Open in {finished.space.name}</Button>
        </div>
      ) : isLoading ? (
        <p className="transfer_dialog-note">Loading your Spaces…</p>
      ) : !space ? (
        <>
          <p className="transfer_dialog-note">There is no other Space you can add to. Create one from the Space switcher first.</p>
          <div className="ui-modal-actions transfer_dialog-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <form onSubmit={submit} className="ui-modal-form">
          <label className="transfer_dialog-field">
            <span className="transfer_dialog-label">Space</span>
            <Select value={space.id} onChange={(e) => { setChosenSpaceId(Number(e.target.value)); setChosenFolderId(null) }}>
              {targets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </label>
          <label className="transfer_dialog-field">
            <span className="transfer_dialog-label">Folder</span>
            <Select value={folderId ?? ''} disabled={loadingFolders || choices.length === 0} onChange={(e) => setChosenFolderId(Number(e.target.value))}>
              {choices.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </Select>
          </label>
          {notice && <p className="transfer_dialog-note">{notice}</p>}
          <FormError message={blocker} />
          <FormError message={error} />
          <div className="ui-modal-actions transfer_dialog-actions">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={transfer.isPending || folderId == null || awaitingAttached || blocker != null}>{transferVerb(mode)}</Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
