import { Select } from '@/components/ui'
import type { TableField } from '@/api/tables'
import { mirrorSources, relationFields, type LinkedTable } from '@/data/mirror'

// The two choices that define a mirror field: which relation (connect) field
// to read through, and which field of the linked collection to show.
export default function MirrorFieldForm({ fields, linked, relationFieldId, sourceFieldId, onRelationFieldChange, onSourceFieldChange, selectClassName }: {
  fields: TableField[]; linked: Map<number, LinkedTable>; relationFieldId: string; sourceFieldId: string
  onRelationFieldChange: (id: string) => void; onSourceFieldChange: (id: string) => void; selectClassName: string
}) {
  const links = relationFields(fields)
  const via = links.find(f => String(f.id) === relationFieldId)
  const target = via?.relation_table_id ? linked.get(via.relation_table_id) : undefined
  return <>
    <label className="table_editor-field_form_label">Connected through
      <Select required className={selectClassName} value={relationFieldId} onChange={e => { onRelationFieldChange(e.target.value); onSourceFieldChange('') }}>
        <option value="">{links.length ? 'Choose a relation field' : 'Add a relation field first'}</option>
        {links.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </Select>
    </label>
    <label className="table_editor-field_form_label">Field to show
      <Select required disabled={!via} className={selectClassName} value={sourceFieldId} onChange={e => onSourceFieldChange(e.target.value)}>
        <option value="">{via && !target ? 'Loading fields…' : 'Choose a field'}</option>
        {mirrorSources(target).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
      </Select>
    </label>
  </>
}
