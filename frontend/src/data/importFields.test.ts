import { IMPORT_TYPES } from './importFields'

test('offers the scalar types and not relations', () => {
  const values = IMPORT_TYPES.map((t) => t.value)
  expect(values).toEqual(['text', 'integer', 'number', 'boolean', 'date', 'datetime'])
  expect(values).not.toContain('relation')
})
