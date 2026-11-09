import { Button, Input, Select, FormError, ConfirmDialog, Modal, classNames } from '@/components/ui'
import { useEffect, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { Database, Loader2, Map as MapIcon, Pencil, Plus, Table as TableIcon, Trash2 } from 'lucide-react'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import FormulaInput from '@/components/editors/FormulaInput'
import { useWorkspace } from '@/api/workspace'
import { useUpdateDocument } from '@/api/documents'
import { useTable, useEditTable, tableQuery, errorMessage, type TableData, type TableField, type TableRecord, type FieldDataType } from '@/api/tables'
import type { Document } from '@/types'
import FileCell from './FileCell'
import './TableEditor.scss'
import { usePageTitle } from '@/hooks/usePageTitle'
import { flattenFolders } from '@/data/folder'
import { checkFormula, computeFormulas, formatResult, isFormulaField, type FormulaResult } from '@/data/formula'
import CollectionMap from './CollectionMap'
import CollectionCsv from './CollectionCsv'
import { columnSummary, SUMMARY_LABEL, withUnit, type SummaryKind } from '@/data/tableSummary'

const types: FieldDataType[] = ['text', 'integer', 'number', 'boolean', 'date', 'datetime', 'relation', 'file', 'files', 'formula']
const inputClass = 'table_editor-input'

// A formula field's value for one record: worked out live from the row's other
// fields (including edits not saved yet), never typed in.
function FormulaCell({ field, result }: { field: TableField; result: FormulaResult }) {
  const failure = 'error' in result ? result : null
  return <output aria-label={field.name} className={`table_editor-formula_result${failure ? ' table_editor-formula_result--error' : ''}`}>
    {formatResult(result)}
    {failure && <span className="table_editor-formula_message">{failure.message}</span>}
  </output>
}

function RecordRow({ record, fields, relations, files, busy, onSave, onDelete }: {
  record?: TableRecord; fields: TableField[]; relations: Map<number, TableData>; files: Document[]; busy: boolean
  onSave: (values: TableRecord['values']) => Promise<void>; onDelete?: () => void
}) {
  const [values, setValues] = useState<TableRecord['values']>(record?.values ?? {})
  const [error, setError] = useState('')
  const savedValues = JSON.stringify(record?.values ?? {})
  useEffect(() => { setValues(JSON.parse(savedValues)) }, [savedValues])
  const dirty = JSON.stringify(values) !== JSON.stringify(record?.values ?? {})
  // File fields hold lists of file ids, which formulas can't use, so they count as empty.
  const formulas = useMemo(() => computeFormulas(fields, Object.fromEntries(Object.entries(values).map(([id, v]) => [id, Array.isArray(v) ? null : v]))), [fields, values])
  async function save() {
    setError('')
    const liveValues = Object.fromEntries(Object.entries(values).filter(([id]) => fields.some(field => String(field.id) === id && !isFormulaField(field))))
    try { await onSave(liveValues); if (!record) setValues({}) } catch (e) { setError(errorMessage(e)) }
  }
  function set(field: TableField, value: string | number | boolean | number[] | null) { setValues(prev => ({ ...prev, [field.id]: value })) }
  return <tr className="table_editor-row">
    <td className="table_editor-cell table_editor-cell--id">{record ? `#${record.id}` : 'New'}</td>
    {fields.map(field => {
      if (isFormulaField(field)) return <td key={field.id} className="table_editor-cell"><FormulaCell field={field} result={formulas.get(field.id)!} /></td>
      const value = values[field.id]
      const target = field.relation_table_id ? relations.get(field.relation_table_id) : undefined
      return <td key={field.id} className="table_editor-cell">
        {field.data_type === 'boolean' ? <Select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value === '' ? null : e.target.value === 'true')}>
          <option value="">Empty</option><option value="true">True</option><option value="false">False</option>
        </Select> : field.data_type === 'file' || field.data_type === 'files' ? <FileCell label={field.name} many={field.data_type === 'files'} value={value as number | number[] | null | undefined} files={files} onChange={v => set(field, v)} /> : field.data_type === 'relation' ? <Select aria-label={field.name} className={inputClass} value={value == null ? '' : String(value)} onChange={e => set(field, e.target.value ? Number(e.target.value) : null)}>
          <option value="">{target ? 'No linked record' : 'Loading records…'}</option>
          {target?.records.map(row => {
            const labelField = target.fields.find(f => f.data_type === 'text')
            const label = labelField ? row.values[labelField.id] : null
            return <option key={row.id} value={row.id}>#{row.id}{label ? ` · ${label}` : ''}</option>
          })}
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
    <td className="table_editor-cell table_editor-cell--add" />
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
  const [title, setTitle] = useState(doc.title)
  usePageTitle(title)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [editingField, setEditingField] = useState<TableField | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [mode, setMode] = useState<'grid' | 'map'>('grid')
  const [name, setName] = useState('')
  const [type, setType] = useState<FieldDataType>('text')
  const [relationTable, setRelationTable] = useState('')
  const [formula, setFormula] = useState('')
  const [formulaTouched, setFormulaTouched] = useState(false)
  const otherFields = (data?.fields ?? []).filter(f => f.id !== editingField?.id)
  const formulaProblem = type === 'formula' && formula.trim() ? checkFormula(name.trim(), formula.trim(), otherFields) : null
  const [unit, setUnit] = useState('')
  const [summaries, setSummaries] = useState<Record<number, SummaryKind>>({})
  const tables = flattenFolders(workspace?.folders ?? []).flatMap(f => f.documents ?? []).filter(d => d.doc_type === 'table')
  const targetIds = [...new Set((data?.fields ?? []).flatMap(f => f.relation_table_id ? [f.relation_table_id] : []))]
  const queries = useQueries({ queries: targetIds.map(tableQuery) })
  const relations = new Map(targetIds.flatMap((id, i) => queries[i].data ? [[id, queries[i].data!] as const] : []))
  const busy = edit.isPending
  const uploadedFiles = flattenFolders(workspace?.folders ?? []).flatMap(f => f.documents ?? []).filter(d => d.doc_type === 'file')

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
    setRelationTable(field?.relation_table_id ? String(field.relation_table_id) : ''); setUnit(field?.unit ?? ''); setShowForm(true); setFieldError('')
    setFormula(field?.formula ?? ''); setFormulaTouched(false)
  }
  async function saveField(e: React.FormEvent) {
    e.preventDefault()
    if (formulaProblem) { setFormulaTouched(true); return }
    try {
      await action(editingField ? `fields/${editingField.id}` : 'fields', editingField ? 'patch' : 'post', { field: { name: name.trim(), data_type: type, relation_table_id: type === 'relation' ? Number(relationTable) : null, ...(type === 'integer' || type === 'number' ? { unit: unit.trim() || null } : {}), ...(type === 'formula' && { formula: formula.trim() }) } })
      setShowForm(false)
    } catch (e) { setFieldError(errorMessage(e)) }
  }
  async function rename() {
    if (title === doc.title) return
    try { await updateDocument.mutateAsync({ id: doc.id, title: title.trim() }); setError('') } catch (e) { setError(errorMessage(e)) }
  }

  return <WorkspaceLayout>
    <div className="view-table_editor">
      <div className="table_editor-header">
        <Database className="table_editor-header_icon" />
        <Input aria-label="Collection title" className="table_editor-title" value={title} onChange={e => setTitle(e.target.value)} onBlur={rename} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }} />
        <Button variant="secondary" disabled={busy} onClick={() => fieldForm()} className="table_editor-add_field_button">Add field</Button>
      </div>
      {data && data.fields.length > 0 && <div className="table_editor-modes" role="group" aria-label="Collection view">
        {([['grid', 'Grid', TableIcon], ['map', 'Map', MapIcon]] as const).map(([key, label, Icon]) => <Button key={key} aria-pressed={mode === key} onClick={() => setMode(key)}
          className={classNames('table_editor-mode_button', mode === key && 'table_editor-mode_button--active')}><Icon className="table_editor-mode_icon" aria-hidden="true" />{label}</Button>)}
      </div>}
      <CollectionCsv docId={doc.id} title={title} data={data} />
      <div className="table_editor-summary">{data?.records.length ?? 0} records · {data?.fields.length ?? 0} fields · Dates and times use UTC. Save each record after editing.</div>
      <FormError message={error || (loadError ? errorMessage(loadError) : null)} className="table_editor-error" />
      {isLoading ? <Loader2 className="table_editor-spinner" /> : data && mode === 'map' ? <CollectionMap data={data} /> : data && <div className="table_editor-grid">
        {(type === 'integer' || type === 'number') && <label className="table_editor-field_form_label">Unit (optional)<Input maxLength={20} placeholder="kg, $, %…" value={unit} onChange={e => setUnit(e.target.value)} /></label>}
        <table className="table_editor-table">
          <thead className="table_editor-table_head"><tr><th className="table_editor-column_head table_editor-column_head--id">Record ID</th>
            {data.fields.map(field => <th key={field.id} className="table_editor-column_head"><div className="table_editor-column_head_main"><Button onClick={() => fieldForm(field)} className="table_editor-column_name_button"><span>{field.name}</span><Pencil className="table_editor-column_edit_icon" /></Button><Button aria-label={`Delete field ${field.name}`} disabled={busy} onClick={() => remove(`fields/${field.id}`, `Delete “${field.name}” and all its values?`)} className="table_editor-icon_button table_editor-icon_button--column"><Trash2 className="table_editor-icon_button_icon table_editor-icon_button_icon--sm" /></Button></div><span className="table_editor-column_type">{field.data_type}{field.unit ? ` (${field.unit})` : ''}{field.relation_table_id ? ` → ${tables.find(t => t.id === field.relation_table_id)?.title ?? 'Table'}` : ''}</span>{field.formula && <code className="table_editor-column_formula" title={field.formula}>= {field.formula}</code>}</th>)}
            <th className="table_editor-column_head table_editor-column_head--add"><Button aria-label="New field" title="Add field" disabled={busy} onClick={() => fieldForm()} className="table_editor-icon_button table_editor-icon_button--add"><Plus className="table_editor-icon_button_icon" /></Button></th>
            <th className="table_editor-column_head table_editor-column_head--actions">Actions</th>
          </tr></thead>
          <tbody>{data.fields.length === 0 && <tr><td colSpan={3} className="table_editor-cell table_editor-cell--empty">Add a field to start: text, numbers, dates, booleans, files, a relation to another Collection, or a formula.</td></tr>}
            {data.records.map(record => <RecordRow key={record.id} record={record} fields={data.fields} relations={relations} files={uploadedFiles} busy={busy} onSave={values => action(`records/${record.id}`, 'patch', { record: { values } })} onDelete={() => remove(`records/${record.id}`, `Delete record #${record.id}?`)} />)}
            {data.fields.length > 0 && <RecordRow fields={data.fields} relations={relations} files={uploadedFiles} busy={busy} onSave={values => action('records', 'post', { record: { values } })} />}
          </tbody>
          {data.fields.some(f => f.data_type === 'integer' || f.data_type === 'number') && <tfoot className="table_editor-summary_row"><tr>
            <th className="table_editor-column_head table_editor-column_head--id">Summary</th>
            {data.fields.map(field => <td key={field.id} className="table_editor-cell">{field.data_type === 'integer' || field.data_type === 'number' ? <>
              <Select aria-label={`Summary of ${field.name}`} className={inputClass} value={summaries[field.id] ?? 'none'} onChange={e => setSummaries(current => ({ ...current, [field.id]: e.target.value as SummaryKind }))}>
                {(Object.keys(SUMMARY_LABEL) as SummaryKind[]).map(kind => <option key={kind} value={kind}>{SUMMARY_LABEL[kind]}</option>)}
              </Select>
              <span className="table_editor-summary_value">{withUnit(columnSummary(data.records.map(r => r.values[String(field.id)]), summaries[field.id] ?? 'none'), summaries[field.id] === 'count' ? null : field.unit)}</span>
            </> : null}</td>)}
            <td className="table_editor-cell" />
          </tr></tfoot>}
        </table>
      </div>}
    </div>
    <Modal open={showForm} title={editingField ? `Edit ${editingField.name}` : 'Add field'} onClose={() => setShowForm(false)}>
      <form onSubmit={saveField} className="ui-modal-form table_editor-field_form">
        <label className="table_editor-field_form_label">Field name<Input required maxLength={255} autoFocus value={name} onChange={e => setName(e.target.value)} /></label>
        <label className="table_editor-field_form_label">Data type<Select value={type} onChange={e => setType(e.target.value as FieldDataType)}>{types.map(t => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}</Select></label>
        {type === 'relation' && <label className="table_editor-field_form_label">Related collection<Select required value={relationTable} onChange={e => setRelationTable(e.target.value)}><option value="">Choose a collection</option>{tables.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}</Select></label>}
        {type === 'formula' && <FormulaInput value={formula} onChange={setFormula} onBlur={() => setFormulaTouched(true)} fields={otherFields} problem={formulaProblem} showProblem={formulaTouched} />}
        {editingField && <p className="table_editor-field_form_hint">Clear this field’s values before changing its data type or related collection.</p>}
        <FormError message={fieldError} />
        <div className="ui-modal-actions">
          <Button type="button" onClick={() => setShowForm(false)}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy || !name.trim()}>{editingField ? 'Save field' : 'Create field'}</Button>
        </div>
      </form>
    </Modal>
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
