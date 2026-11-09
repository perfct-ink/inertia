import { useState, type FormEvent } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button, ConfirmDialog, Input, Menu, Modal, Select, type MenuItem } from '@/components/ui'
import { useCreateSavedView, useDeleteSavedView, useSavedViews, useUpdateSavedView } from '@/api/savedViews'
import { useWorkspace } from '@/api/workspace'
import { SAVED_VIEW_NAME_MAX, canChangeSavedView, groupSavedViews, sameConfig, savedViewLabel, type SavedView, type SavedViewPage } from '@/data/savedView'
import { canWriteWorkspace } from '@/data/workspace'
import { useAuthStore } from '@/store/auth'
import './SavedViews.scss'

// Saved views for a page: pick one to apply it (or "Default view" to start
// over), save the page's current choices under a name (private to you, or shared
// with the Space), and, for a view you may change, update it with the current
// choices, rename or share it, or delete it. The page owns what a view holds:
// `config` is its current choices, `parse` turns a stored config into a safe one
// and `onApply` puts it on the page.
export default function SavedViews<Config extends object>({ page, config, parse, onApply }: {
  page: SavedViewPage
  config: Config
  parse: (raw: unknown) => Config
  onApply: (config: Config) => void
}) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: workspace } = useWorkspace()
  const role = workspace?.role
  const { data: views = [] } = useSavedViews(page)
  const create = useCreateSavedView(page)
  const update = useUpdateSavedView(page)
  const remove = useDeleteSavedView(page)
  const [selectedId, setSelectedId] = useState('')
  const [dialog, setDialog] = useState<'save' | 'edit' | 'delete' | null>(null)

  const groups = groupSavedViews(views, userId)
  // A view someone else deleted since it was picked is no longer selected.
  const current = views.find((v) => String(v.id) === selectedId)
  const canSave = canWriteWorkspace(role)
  const canChange = !!current && canSave && canChangeSavedView(current, userId, role)
  const modified = !!current && !sameConfig(config, parse(current.config))

  function pick(id: string) {
    setSelectedId(id)
    const view = views.find((v) => String(v.id) === id)
    onApply(parse(view?.config))
  }

  const items: MenuItem[] = current ? [
    ...(modified ? [{ key: 'update', label: 'Update with current settings', onSelect: () => update.mutate({ id: current.id, config }) }] : []),
    { key: 'edit', label: 'Rename or share…', onSelect: () => setDialog('edit') },
    { key: 'delete', label: 'Delete view…', separatorBefore: true, onSelect: () => setDialog('delete') },
  ] : []

  return (
    <div className="saved_views" role="group" aria-label="Saved views">
      <Select aria-label="Saved view" value={current ? selectedId : ''} onChange={(e) => pick(e.target.value)}>
        <option value="">Default view</option>
        {groups.mine.length > 0 && (
          <optgroup label="My views">
            {groups.mine.map((v) => <option key={v.id} value={v.id}>{savedViewLabel(v, userId)}</option>)}
          </optgroup>
        )}
        {groups.shared.length > 0 && (
          <optgroup label="Shared with the Space">
            {groups.shared.map((v) => <option key={v.id} value={v.id}>{savedViewLabel(v, userId)}</option>)}
          </optgroup>
        )}
      </Select>
      {modified && <span className="saved_views-modified">Changed</span>}
      {canSave && <Button variant="secondary" onClick={() => setDialog('save')}>Save view…</Button>}
      {canChange && (
        <Menu label={`Manage view ${current.name}`} triggerClassName="saved_views-trigger" items={items}>
          Manage <ChevronDown className="saved_views-chevron" aria-hidden="true" />
        </Menu>
      )}

      <SavedViewDialog
        key={`${dialog}-${current?.id}`}
        open={dialog === 'save' || dialog === 'edit'}
        view={dialog === 'edit' ? current : undefined}
        saving={create.isPending || update.isPending}
        onClose={() => setDialog(null)}
        onSubmit={(name, shared) => {
          const done = { onSuccess: () => setDialog(null) }
          if (dialog === 'edit' && current) update.mutate({ id: current.id, name, shared }, done)
          else create.mutate({ name, shared, config }, { onSuccess: (view) => { setSelectedId(String(view.id)); setDialog(null) } })
        }}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        title={`Delete ${current?.name ?? 'view'}?`}
        description={current?.shared ? 'It is shared, so it disappears for everyone in the Space.' : undefined}
        confirmLabel="Delete view"
        destructive
        onConfirm={() => current && remove.mutate(current.id, { onSuccess: () => setSelectedId('') })}
        onClose={() => setDialog(null)}
      />
    </div>
  )
}

// Names a new view, or renames and shares an existing one. It stays open until
// the save works; a failure shows the API client's error notice.
function SavedViewDialog({ open, view, saving, onClose, onSubmit }: {
  open: boolean
  view?: SavedView
  saving: boolean
  onClose: () => void
  onSubmit: (name: string, shared: boolean) => void
}) {
  const [name, setName] = useState(view?.name ?? '')
  const [shared, setShared] = useState(view?.shared ?? false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim()) onSubmit(name.trim(), shared)
  }

  return (
    <Modal open={open} title={view ? 'Rename or share view' : 'Save view'} onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <Input aria-label="View name" value={name} maxLength={SAVED_VIEW_NAME_MAX} placeholder="Name this view" autoFocus onChange={(e) => setName(e.target.value)} />
        <label className="saved_views-share">
          <Input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with the Space
        </label>
        <p className="saved_views-help">
          {shared ? 'Everyone in the Space can use it. Only you and Space admins can change it.' : 'Only you can see it.'}
        </p>
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || saving}>Save</Button>
        </div>
      </form>
    </Modal>
  )
}
