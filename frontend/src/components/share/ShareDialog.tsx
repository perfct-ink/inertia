import { useEffect, useState, type FormEvent } from 'react'
import { Check, Copy, Link2, Loader2 } from 'lucide-react'
import { Button, ConfirmDialog, FormError, Input, Modal, Select } from '@/components/ui'
import { useCreateShare, useDeleteShare, useShares } from '@/api/shares'
import { useShareStore } from '@/store/share'
import { DEFAULT_EXPIRY, EXPIRY_CHOICES, expiryText, permissionText, sharedUrl, type ShareLink, type ShareTarget } from '@/data/share'
import { errorMessage } from '@/util/errorMessage'
import './ShareDialog.scss'

const COPIED_MS = 2000

// Mount once (the sidebar does): shows the dialog for whatever a menu or
// button asked to share.
export function ShareHost() {
  const target = useShareStore((s) => s.target)
  const close = useShareStore((s) => s.close)
  return target ? <ShareDialog target={target} onClose={close} /> : null
}

function LinkRow({ link, onTurnOff }: { link: ShareLink; onTurnOff: (link: ShareLink) => void }) {
  const url = sharedUrl(window.location.origin, link.token)
  const [copied, setCopied] = useState(false)
  const [copyFailed, setCopyFailed] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    setCopyFailed(false)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      // No clipboard access (an insecure page, a denied permission): the link
      // is selectable in the field above for copying by hand.
      setCopyFailed(true)
    }
  }

  return (
    <li className="share_dialog-link">
      <div className="share_dialog-link_row">
        <Input
          readOnly
          aria-label="Share link"
          value={url}
          className="share_dialog-url"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button type="button" variant="secondary" onClick={copy} aria-label={copied ? 'Link copied' : 'Copy link'}>
          {copied ? <Check className="share_dialog-icon" aria-hidden="true" /> : <Copy className="share_dialog-icon" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onTurnOff(link)}>Turn off</Button>
      </div>
      <p className="share_dialog-meta">{permissionText(link.permission)} · {expiryText(link.expires_at)}</p>
      <FormError message={copyFailed ? 'Could not copy automatically. Select the link and copy it.' : null} />
    </li>
  )
}

// Makes, lists, copies and turns off the share links of one document or
// folder. A link lets anyone who has it read the item, view only, without an
// account (docs/features/shared_links.md); turning it off stops it at once.
export function ShareDialog({ target, onClose }: { target: ShareTarget; onClose: () => void }) {
  const { data: links = [], isLoading, isError, error: loadError } = useShares(target)
  const create = useCreateShare(target)
  const turnOff = useDeleteShare()
  const [expiry, setExpiry] = useState(DEFAULT_EXPIRY)
  const [confirming, setConfirming] = useState<ShareLink | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    create.mutate({ expires_in_days: expiry })
  }

  const what = target.kind === 'folder' ? 'folder' : 'document'
  const error = isError ? errorMessage(loadError) : create.isError ? errorMessage(create.error) : turnOff.isError ? errorMessage(turnOff.error) : null

  return (
    <>
      <Modal
        open
        wide
        title={`Share “${target.name}”`}
        description={`Anyone with a link can read this ${what}, view only. They don't need an account, and can't see anything else in the Space.`}
        onClose={onClose}
      >
        <form onSubmit={submit} className="share_dialog-create">
          <label className="share_dialog-field">
            <span className="share_dialog-label">Link expires</span>
            <Select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
              {EXPIRY_CHOICES.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
            </Select>
          </label>
          <Button type="submit" variant="primary" disabled={create.isPending}>
            <Link2 className="share_dialog-icon" aria-hidden="true" /> Create link
          </Button>
        </form>
        {target.kind === 'folder' && (
          <p className="share_dialog-note">A folder link shows the documents in the folder and its subfolders. Spreadsheets, Collections and files are left out for now.</p>
        )}
        <FormError message={error} />
        {isLoading ? (
          <p role="status" className="share_dialog-note"><Loader2 className="share_dialog-spinner" aria-hidden="true" /> Loading links</p>
        ) : links.length === 0 ? (
          <p className="share_dialog-note">No links yet.</p>
        ) : (
          <ul className="share_dialog-links" aria-label="Share links">
            {links.map((link) => <LinkRow key={link.id} link={link} onTurnOff={setConfirming} />)}
          </ul>
        )}
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirming !== null}
        title="Turn off this link?"
        description="Anyone using it will no longer be able to open it. You can make a new link at any time."
        confirmLabel="Turn off"
        destructive
        onConfirm={() => { if (confirming) turnOff.mutate(confirming.id) }}
        onClose={() => setConfirming(null)}
      />
    </>
  )
}
