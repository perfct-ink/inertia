import { useState } from 'react'
import { Button, Input, Select } from '@/components/ui'
import { useCreateSavedView, useDeleteSavedView, useSavedViews } from '@/api/savedViews'
import { useAuthStore } from '@/store/auth'

// Saved views for a page: pick one to apply it, save the current choices under
// a name (private, or shared with the Space), or delete one of your own.
export default function SavedViews({ page, config, onApply }: { page: string; config: Record<string, unknown>; onApply: (config: Record<string, unknown>) => void }) {
  const userId = useAuthStore((s) => s.user?.id)
  const { data: views = [] } = useSavedViews(page)
  const create = useCreateSavedView(page)
  const remove = useDeleteSavedView(page)
  const [selected, setSelected] = useState('')
  const [name, setName] = useState('')
  const [shared, setShared] = useState(false)
  const current = views.find((v) => String(v.id) === selected)

  function save() {
    const trimmed = name.trim()
    if (!trimmed) return
    create.mutate({ name: trimmed, shared, config }, { onSuccess: (view) => { setName(''); setShared(false); setSelected(String(view.id)) } })
  }

  return (
    <div className="saved_views" role="group" aria-label="Saved views">
      <Select
        aria-label="Saved views"
        value={selected}
        onChange={(e) => {
          setSelected(e.target.value)
          const view = views.find((v) => String(v.id) === e.target.value)
          if (view) onApply(view.config)
        }}
      >
        <option value="">Views…</option>
        {views.map((v) => <option key={v.id} value={v.id}>{v.name}{v.shared ? ` (shared, ${v.owner_name})` : ''}</option>)}
      </Select>
      {current && current.user_id === userId && (
        <Button aria-label={`Delete view ${current.name}`} onClick={() => { remove.mutate(current.id); setSelected('') }}>Delete view</Button>
      )}
      <Input aria-label="New view name" placeholder="Save this view as…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') save() }} />
      <label><Input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} /> Share with the Space</label>
      <Button variant="secondary" onClick={save} disabled={!name.trim() || create.isPending}>Save view</Button>
    </div>
  )
}
