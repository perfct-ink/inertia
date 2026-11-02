import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MirrorFieldForm from './MirrorFieldForm'
import type { TableField } from '@/api/tables'

const field = (id: number, name: string, data_type: TableField['data_type'], relation_table_id: number | null = null): TableField => ({ id, name, data_type, relation_table_id })
const contacts = [field(1, 'Company', 'relation', 9), field(2, 'Age', 'integer')]
const companies = { fields: [field(20, 'Name', 'text'), field(21, 'Parent', 'relation', 9), field(22, 'Logo', 'file')] }

function renderForm(props: Partial<React.ComponentProps<typeof MirrorFieldForm>> = {}) {
  const onRelationFieldChange = jest.fn()
  const onSourceFieldChange = jest.fn()
  render(<MirrorFieldForm fields={contacts} linked={new Map([[9, companies]])} relationFieldId="" sourceFieldId="" selectClassName="x"
    onRelationFieldChange={onRelationFieldChange} onSourceFieldChange={onSourceFieldChange} {...props} />)
  return { onRelationFieldChange, onSourceFieldChange }
}

test('only relation fields can be connected through, and the shown field waits for that choice', () => {
  renderForm()
  const via = screen.getByLabelText('Connected through')
  expect(via).toHaveTextContent('Company')
  expect(via).not.toHaveTextContent('Age')
  expect(screen.getByLabelText('Field to show')).toBeDisabled()
})

test('choosing a relation field lists the plain fields of the linked collection and clears the shown field', () => {
  const { onRelationFieldChange, onSourceFieldChange } = renderForm({ relationFieldId: '1' })
  const shown = screen.getByLabelText('Field to show')
  expect(shown).toBeEnabled()
  expect(shown).toHaveTextContent('Name')
  expect(shown).not.toHaveTextContent('Parent')
  expect(shown).not.toHaveTextContent('Logo')
  fireEvent.change(screen.getByLabelText('Connected through'), { target: { value: '1' } })
  expect(onRelationFieldChange).toHaveBeenCalledWith('1')
  expect(onSourceFieldChange).toHaveBeenCalledWith('')
  fireEvent.change(shown, { target: { value: '20' } })
  expect(onSourceFieldChange).toHaveBeenLastCalledWith('20')
})

test('a collection with no relation field says to add one first', () => {
  renderForm({ fields: [field(2, 'Age', 'integer')] })
  expect(screen.getByLabelText('Connected through')).toHaveTextContent('Add a relation field first')
})

test('the shown field says it is loading until the linked collection arrives', () => {
  renderForm({ relationFieldId: '1', linked: new Map() })
  expect(screen.getByLabelText('Field to show')).toHaveTextContent('Loading fields…')
})
