import { Button, Input, Select, FormError, ConfirmDialog } from '@/components/ui'
import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Database, Loader2, Pencil, Trash2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useWorkspace } from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import { useTable, useEditTable, tableQuery, errorMessage, type CellValue, type ReverseField, type TableData, type TableField, type TableRecord, type DataType } from '@/api/tables'
import type { Document } from '@/types'
import { useTabsStore } from '@/store/tabs'
import './TableEditor.scss'
import { usePageTitle } from '@/hooks/usePageTitle'
import { flattenFolders } from '@/data/folder'
import { holdsMany, linkedIds, pickedIds, recordLabel } from '@/data/collection'

const types: DataType[] = ['text', 'integer', 'number', 'boolean', 'date', 'datetime', 'relation']
const inputClass = 'table_editor-input'
const fieldInputClass = `${inputClass} table_editor-input--field`

function RecordRow({ record, fields, reverseFields, relations, busy, onSave, onDelete }: {
  record?: TableRecord; fields: TableField[]; reverseFields: ReverseField[]; relations: Map<number, TableData>; busy: boolean
  onSave: (values: TableRecord['values']) => Promise<void>; onDelete?: () => void
}) {
  const [values, setValues] = useState<TableRecord['values']>(record?.values ?? {})
  const [error, setError] = useState('')
  const savedValues = JSON.stringify(record?.values ?? {})
  useEffect(() => { setValues(JSON.parse(savedValues)) }, [savedValues])
  const dirty = JSON.stringify(values) !== JSON.stringify(record?.values ?? {})
  async function save() {
    setError('')
    const liveValues = Object.fromEntries(Object.entries(values).filter(([id]) => fields.some(field => String(field.id) === id)))
    try { await onSave(liveValues); if (!record) setValues({}) } catch (e) { setError(errorMessage(e)) }
  }
  function set(field: TableField, value: CellValue) { setValues(prev => ({ ...prev, [field.id]: value })) }
  return <tr className="table_editor-row">
    <td className="table_editor-cell table_editor-cell--id">{record ? `#${record.id}` : 'New'}</td>
    {fields.map(field => {
      const value = values[field.id]
      const target = field.relation_table_id ? relations.get(field.relation_table_id) : undefined
      return <td key={field.id} className="table_editor-cell">
        {field.data_type === 'boolean' ? <Select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Empty</option><option value="true">True</option><option value="false">False</option>
        </Select> : holdsMany(field) ? <Select multiple aria-label={field.name} className={`${inputClass} table_editor-input--many`} value={linkedIds(value).map(String)} onChange={e => { const ids = pickedIds(Array.from(e.target.options)); set(field, ids.length ? ids : null) }}>
          {target?.records.map(row => <option key={row.id} value={row.id}>{recordLabel(target.fields, row)}</option>)}
        </Select> : field.data_type === 'relation' ? <Select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value ? Number(e.target.value) : null)}>
          <option value="">{target ? 'No linked record' : 'Loading records…'}</option>
          {target?.records.map(row => <option key={row.id} value={row.id}>{recordLabel(target.fields, row)}</option>)}
        </Select> : <Input aria-label={field.name} className={inputClass}
          type={field.data_type === 'integer' || field.data_type === 'number' ? 'number' : field.data_type === 'datetime' ? 'datetime-local' : field.data_type === 'date' ? 'date' : 'text'}
          step={field.data_type === 'integer' ? '1' : field.data_type === 'number' ? 'any' : undefined}
          value={value == null ? '' : field.data_type === 'datetime' ? new Date(String(value)).toISOString().slice(0, 16) : String(value)}
          onChange={e => {
            const raw = e.target.value
            set(field, !raw ? null : field.data_type === 'number' || field.data_type === 'integer' ? Number(raw) : field.data_type === 'datetime' ? `${raw}:00Z` : raw)
          }} />}
      </td>
    })}
    {reverseFields.map(field => <td key={`reverse-${field.id}`} className="table_editor-cell table_editor-cell--reverse">
      {(record?.reverse?.[field.id] ?? []).map(link => <span key={link.id} className="table_editor-reverse_link">{link.label}</span>)}
    </td>)}
    <td className="table_editor-cell table_editor-cell--actions">
      <div className="table_editor-cell_actions">
        <Button variant="secondary" disabled={busy || (!!record && !dirty)} onClick={save} className="table_editor-save_button">{record ? 'Save' : 'Add record'}</Button>
        {record && <Button aria-label={`Delete record ${record.id}`} disabled={busy} onClick={onDelete} className="table_editor-icon_button table_editor-icon_button--row"><Trash2 className="table_editor-icon_button_icon" /></Button>}
      </div>
      <FormError message={error} className="table_editor-row_error" />
    </td>
  </tr>
}

export default function TableEditor({ doc }: { doc: Document }) {
  const { data, isLoading, error: loadError } = useTable(doc.id)
  const edit = useEditTable(doc.id)
  const updateDocument = useUpdateDocument()
  const { data: workspace } = useWorkspace()
  const updateTitle = useTabsStore(s => s.updateTitle)
  const [title, setTitle] = useState(doc.title)
  usePageTitle(title)
  const [error, setError] = useState('')
  const [editingField, setEditingField] = useState<TableField | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<DataType>('text')
  const [relationTable, setRelationTable] = useState('')
  const [allowMany, setAllowMany] = useState(false)
  const tables = flattenFolders(workspace?.folders ?? []).flatMap(f => f.documents ?? []).filter(d => d.doc_type === 'table')
  const targetIds = [...new Set((data?.fields ?? []).flatMap(f => f.relation_table_id ? [f.relation_table_id] : []))]
  const queries = useQueries({ queries: targetIds.map(tableQuery) })
  const relations = new Map(targetIds.flatMap((id, i) => queries[i].data ? [[id, queries[i].data!] as const] : []))
  const busy = edit.isPending

  async function action(path: string, method: 'post' | 'patch' | 'delete', body?: unknown) {
    setError('')
    await edit.mutateAsync({ path, method, data: body })
  }
  const [pendingRemoval, setPendingRemoval] = useState<{ path: string; message: string } | null>(null)
  const remove = (path: string, message: string) => setPendingRemoval({ path, message })
  async function confirmRemoval() {
    if (!pendingRemoval) return
    try { await action(pendingRemoval.path, 'delete') } catch (e) { setError(errorMessage(e)) }
  }
  function fieldForm(field?: TableField) {
    setEditingField(field ?? null); setName(field?.name ?? ''); setType(field?.data_type ?? 'text')
    setRelationTable(field?.relation_table_id ? String(field.relation_table_id) : ''); setAllowMany(!!field?.allow_many); setShowForm(true); setError('')
  }
  async function saveField(e: React.FormEvent) {
    e.preventDefault()
    try {
      await action(editingField ? `fields/${editingField.id}` : 'fields', editingField ? 'patch' : 'post', { field: { name: name.trim(), data_type: type, relation_table_id: type === 'relation' ? Number(relationTable) : null, allow_many: type === 'relation' && allowMany } })
      setShowForm(false)
    } catch (e) { setError(errorMessage(e)) }
  }
  async function rename() {
    if (title === doc.title) return
    try { const saved = await updateDocument.mutateAsync({ id: doc.id, title: title.trim() }); updateTitle(String(doc.id), saved.title); setError('') } catch (e) { setError(errorMessage(e)) }
  }

  return <WorkspaceLayout>
    <div className="view-table_editor">
      <div className="table_editor-header">
        <Database className="table_editor-header_icon" />
        <Input aria-label="Collection title" className="table_editor-title" value={title} onChange={e => setTitle(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <Button variant="secondary" disabled={busy} onClick={() => fieldForm()} className="table_editor-add_field_button">Add field</Button>
      </div>
      <div className="table_editor-summary">{data?.records.length ?? 0} records · {data?.fields.length ?? 0} fields · Dates and times use UTC. Save each record after editing.</div>
      <FormError message={error || (loadError ? errorMessage(loadError) : null)} className="table_editor-error" />
      {showForm && <form onSubmit={saveField} className="table_editor-field_form">
        <label className="table_editor-field_form_label">Field name<Input required maxLength={255} autoFocus className={`${fieldInputClass}`} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="table_editor-field_form_label">Data type<Select className={`${fieldInputClass}`} value={type} onChange={e => setType(e.target.value as DataType)}>{types.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</Select></label>
        {type === 'relation' && <label className="table_editor-field_form_label">Related collection<Select required className={`${fieldInputClass}`} value={relationTable} onChange={e => setRelationTable(e.target.value)}><option value="">Choose a collection</option>{tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></label>}
        {type === 'relation' && <label className="table_editor-field_form_label">Links per record<Select className={`${fieldInputClass}`} value={allowMany ? 'many' : 'one'} onChange={e => setAllowMany(e.target.value === 'many')}><option value="one">One record</option><option value="many">Many records</option></Select></label>}
        <Button variant="primary" disabled={busy || !name.trim()} className="table_editor-field_form_button">{editingField ? 'Save field' : 'Create field'}</Button>
        <Button type="button" onClick={() => setShowForm(false)} className="table_editor-cancel_button">Cancel</Button>
        {editingField && <p className="table_editor-field_form_hint">Clear this field’s values before changing its data type or related collection.</p>}
      </form>}
      {isLoading ? <Loader2 className="table_editor-spinner" /> : data && data.fields.length === 0 ? <div className="table_editor-empty"><Database className="table_editor-empty_icon" /><p className="table_editor-empty_title">Define your collection’s fields</p><p className="table_editor-empty_text">Add text, numbers, dates, booleans, or a relation to another collection.</p><Button variant="secondary" onClick={() => fieldForm()} className="table_editor-empty_button">Add first field</Button></div> : data && <div className="table_editor-grid">
        <table className="table_editor-table">
          <thead className="table_editor-table_head"><tr><th className="table_editor-column_head table_editor-column_head--id">Record ID</th>
            {data.fields.map(field => <th key={field.id} className="table_editor-column_head"><div className="table_editor-column_head_main"><Button onClick={() => fieldForm(field)} className="table_editor-column_name_button"><span>{field.name}</span><Pencil className="table_editor-column_edit_icon" /></Button><Button aria-label={`Delete field ${field.name}`} disabled={busy} onClick={() => remove(`fields/${field.id}`, `Delete “${field.name}” and all its values?`)} className="table_editor-icon_button table_editor-icon_button--column"><Trash2 className="table_editor-icon_button_icon table_editor-icon_button_icon--sm" /></Button></div><span className="table_editor-column_type">{field.data_type}{field.relation_table_id ? ` → ${tables.find(t => t.id === field.relation_table_id)?.title ?? 'Collection'}${field.allow_many ? ' (many)' : ''}` : ''}</span></th>)}
            {(data.reverse_fields ?? []).map(field => <th key={`reverse-${field.id}`} className="table_editor-column_head"><div className="table_editor-column_head_main"><span>{field.name}</span></div><span className="table_editor-column_type">linked, read-only</span></th>)}
            <th className="table_editor-column_head table_editor-column_head--actions">Actions</th>
          </tr></thead>
          <tbody>{data.records.map(record => <RecordRow key={record.id} record={record} fields={data.fields} reverseFields={data.reverse_fields ?? []} relations={relations} busy={busy} onSave={values => action(`records/${record.id}`, 'patch', { record: { values } })} onDelete={() => remove(`records/${record.id}`, `Delete record #${record.id}?`)} />)}
            <RecordRow fields={data.fields} reverseFields={data.reverse_fields ?? []} relations={relations} busy={busy} onSave={values => action('records', 'post', { record: { values } })} />
          </tbody>
        </table>
      </div>}
    </div>
    <ConfirmDialog
      open={pendingRemoval !== null}
      title="Delete"
      description={pendingRemoval?.message}
      confirmLabel="Delete"
      destructive
      onConfirm={confirmRemoval}
      onClose={() => setPendingRemoval(null)}
    />
  </WorkspaceLayout>
}
