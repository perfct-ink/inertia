import { useEffect, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Database, Loader2, Pencil, Trash2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useWorkspace } from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import { useTable, useEditTable, tableQuery, errorMessage, type TableData, type TableField, type TableRecord, type DataType } from '@/api/tables'
import type { Document, Folder } from '@/types'
import { useTabsStore } from '@/store/tabs'

const types: DataType[] = ['text', 'integer', 'number', 'boolean', 'date', 'datetime', 'relation']
const inputClass = 'bg-background border rounded px-2 py-1.5 text-sm w-full min-w-32'
function foldersFlat(folders: Folder[]): Folder[] { return folders.flatMap(f => [f, ...foldersFlat(f.children ?? [])]) }

function RecordRow({ record, fields, relations, busy, onSave, onDelete }: {
  record?: TableRecord; fields: TableField[]; relations: Map<number, TableData>; busy: boolean
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
  function set(field: TableField, value: string | number | boolean | null) { setValues(prev => ({ ...prev, [field.id]: value })) }
  return <tr className="border-b">
    <td className="px-3 py-2 text-xs text-muted-foreground">{record ? `#${record.id}` : 'New'}</td>
    {fields.map(field => {
      const value = values[field.id]
      const target = field.relation_table_id ? relations.get(field.relation_table_id) : undefined
      return <td key={field.id} className="p-2 align-top">
        {field.data_type === 'boolean' ? <select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Empty</option><option value="true">True</option><option value="false">False</option>
        </select> : field.data_type === 'relation' ? <select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value ? Number(e.target.value) : null)}>
          <option value="">{target ? 'No linked record' : 'Loading records…'}</option>
          {target?.records.map(row => {
            const labelField = target.fields.find(f => f.data_type === 'text')
            const label = labelField ? row.values[labelField.id] : null
            return <option key={row.id} value={row.id}>#{row.id}{label ? ` · ${label}` : ''}</option>
          })}
        </select> : <input aria-label={field.name} className={inputClass}
          type={field.data_type === 'integer' || field.data_type === 'number' ? 'number' : field.data_type === 'datetime' ? 'datetime-local' : field.data_type === 'date' ? 'date' : 'text'}
          step={field.data_type === 'integer' ? '1' : field.data_type === 'number' ? 'any' : undefined}
          value={value == null ? '' : field.data_type === 'datetime' ? new Date(String(value)).toISOString().slice(0, 16) : String(value)}
          onChange={e => {
            const raw = e.target.value
            set(field, !raw ? null : field.data_type === 'number' || field.data_type === 'integer' ? Number(raw) : field.data_type === 'datetime' ? `${raw}:00Z` : raw)
          }} />}
      </td>
    })}
    <td className="p-2 min-w-40 align-top">
      <div className="flex items-center gap-2">
        <button disabled={busy || (!!record && !dirty)} onClick={save} className="border rounded px-2 py-1.5 text-sm hover:bg-accent disabled:opacity-40">{record ? 'Save' : 'Add record'}</button>
        {record && <button aria-label={`Delete record ${record.id}`} disabled={busy} onClick={onDelete} className="p-1.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-4 h-4" /></button>}
      </div>
      {error && <p role="alert" className="text-xs text-red-500 mt-2 max-w-56">{error}</p>}
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
  const [error, setError] = useState('')
  const [editingField, setEditingField] = useState<TableField | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<DataType>('text')
  const [relationTable, setRelationTable] = useState('')
  const tables = foldersFlat(workspace?.folders ?? []).flatMap(f => f.documents ?? []).filter(d => d.doc_type === 'table')
  const targetIds = [...new Set((data?.fields ?? []).flatMap(f => f.relation_table_id ? [f.relation_table_id] : []))]
  const queries = useQueries({ queries: targetIds.map(tableQuery) })
  const relations = new Map(targetIds.flatMap((id, i) => queries[i].data ? [[id, queries[i].data!] as const] : []))
  const busy = edit.isPending

  async function action(path: string, method: 'post' | 'patch' | 'delete', body?: unknown) {
    setError('')
    await edit.mutateAsync({ path, method, data: body })
  }
  async function remove(path: string, message: string) {
    if (!window.confirm(message)) return
    try { await action(path, 'delete') } catch (e) { setError(errorMessage(e)) }
  }
  function fieldForm(field?: TableField) {
    setEditingField(field ?? null); setName(field?.name ?? ''); setType(field?.data_type ?? 'text')
    setRelationTable(field?.relation_table_id ? String(field.relation_table_id) : ''); setShowForm(true); setError('')
  }
  async function saveField(e: React.FormEvent) {
    e.preventDefault()
    try {
      await action(editingField ? `fields/${editingField.id}` : 'fields', editingField ? 'patch' : 'post', { field: { name: name.trim(), data_type: type, relation_table_id: type === 'relation' ? Number(relationTable) : null } })
      setShowForm(false)
    } catch (e) { setError(errorMessage(e)) }
  }
  async function rename() {
    if (title === doc.title) return
    try { const saved = await updateDocument.mutateAsync({ id: doc.id, title: title.trim() }); updateTitle(String(doc.id), saved.title); setError('') } catch (e) { setError(errorMessage(e)) }
  }

  return <WorkspaceLayout>
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <Database className="w-5 h-5 text-muted-foreground" />
        <input aria-label="Table title" className="text-xl font-semibold bg-transparent outline-none min-w-0 flex-1" value={title} onChange={e => setTitle(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <button disabled={busy} onClick={() => fieldForm()} className="border rounded px-3 py-1.5 text-sm hover:bg-accent">Add field</button>
      </div>
      <div className="px-6 py-3 text-xs text-muted-foreground">{data?.records.length ?? 0} records · {data?.fields.length ?? 0} fields · Dates and times use UTC. Save each record after editing.</div>
      {(error || loadError) && <p role="alert" className="px-6 py-2 text-sm text-red-500">{error || errorMessage(loadError)}</p>}
      {showForm && <form onSubmit={saveField} className="mx-6 mb-4 p-4 border rounded-lg flex flex-wrap items-end gap-3">
        <label className="text-sm">Field name<input required maxLength={255} autoFocus className={`${inputClass} mt-1`} value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="text-sm">Data type<select className={`${inputClass} mt-1`} value={type} onChange={e => setType(e.target.value as DataType)}>{types.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</select></label>
        {type === 'relation' && <label className="text-sm">Related table<select required className={`${inputClass} mt-1`} value={relationTable} onChange={e => setRelationTable(e.target.value)}><option value="">Choose a table</option>{tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</select></label>}
        <button disabled={busy || !name.trim()} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">{editingField ? 'Save field' : 'Create field'}</button>
        <button type="button" onClick={() => setShowForm(false)} className="text-sm px-2 py-1.5">Cancel</button>
        {editingField && <p className="w-full text-xs text-muted-foreground">Clear this field’s values before changing its data type or related table.</p>}
      </form>}
      {isLoading ? <Loader2 className="w-5 h-5 mx-auto mt-8 animate-spin" /> : data && data.fields.length === 0 ? <div className="m-6 p-12 border rounded-lg text-center"><Database className="w-8 h-8 mx-auto mb-3 text-muted-foreground" /><p className="font-medium">Define your table’s fields</p><p className="text-sm text-muted-foreground mt-2">Add text, numbers, dates, booleans, or a relation to another table.</p><button onClick={() => fieldForm()} className="mt-4 border rounded px-3 py-2 text-sm hover:bg-accent">Add first field</button></div> : data && <div className="flex-1 overflow-auto px-6 pb-6">
        <table className="w-full text-left border rounded-lg">
          <thead className="bg-muted/30"><tr><th className="px-3 py-3 text-xs text-muted-foreground font-medium">Record ID</th>
            {data.fields.map(field => <th key={field.id} className="p-2 min-w-48"><div className="flex items-center gap-2"><button onClick={() => fieldForm(field)} className="flex items-center gap-2 text-sm font-medium"><span>{field.name}</span><Pencil className="w-3 h-3 text-muted-foreground" /></button><button aria-label={`Delete field ${field.name}`} disabled={busy} onClick={() => remove(`fields/${field.id}`, `Delete “${field.name}” and all its values?`)} className="ml-auto text-muted-foreground hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button></div><span className="text-xs font-normal text-muted-foreground">{field.data_type}{field.relation_table_id ? ` → ${tables.find(t => t.id === field.relation_table_id)?.title ?? 'Table'}` : ''}</span></th>)}
            <th className="p-2 text-xs text-muted-foreground font-medium">Actions</th>
          </tr></thead>
          <tbody>{data.records.map(record => <RecordRow key={record.id} record={record} fields={data.fields} relations={relations} busy={busy} onSave={values => action(`records/${record.id}`, 'patch', { record: { values } })} onDelete={() => remove(`records/${record.id}`, `Delete record #${record.id}?`)} />)}
            <RecordRow fields={data.fields} relations={relations} busy={busy} onSave={values => action('records', 'post', { record: { values } })} />
          </tbody>
        </table>
      </div>}
    </div>
  </WorkspaceLayout>
}
