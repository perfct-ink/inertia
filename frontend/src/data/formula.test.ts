import { FORMULA_HELP, checkFormula, computeFormulas, formatResult, isFormulaField, type FormulaField } from './formula'

const NOW = new Date('2026-11-01T09:00:00Z')

const price: FormulaField = { id: 1, name: 'Price', data_type: 'number' }
const quantity: FormulaField = { id: 2, name: 'Quantity', data_type: 'integer' }
const formula = (id: number, name: string, source: string): FormulaField => ({ id, name, data_type: 'formula', formula: source })

test('a formula reads the record values of the fields it names', () => {
  const total = formula(3, 'Total', '{Price} * {Quantity}')
  const results = computeFormulas([price, quantity, total], { 1: 2.5, 2: 4 }, NOW)
  expect(results.get(3)).toEqual({ value: 10 })
  expect([...results.keys()]).toEqual([3])
})

test('blank values are zero and every record gets its own result', () => {
  const fields = [price, quantity, formula(3, 'Total', '{Price} * {Quantity}')]
  expect(computeFormulas(fields, { 1: 2.5 }, NOW).get(3)).toEqual({ value: 0 })
  expect(computeFormulas(fields, { 1: 3, 2: 2 }, NOW).get(3)).toEqual({ value: 6 })
})

test('formulas can use other formulas, in any order', () => {
  const fields = [
    formula(4, 'Total with tax', '{Total} * 1.2'),
    price,
    quantity,
    formula(3, 'Total', '{Price} * {Quantity}'),
  ]
  const results = computeFormulas(fields, { 1: 10, 2: 5 }, NOW)
  expect(results.get(3)).toEqual({ value: 50 })
  expect(results.get(4)).toEqual({ value: 60 })
})

test('TODAY uses the time it is given', () => {
  const due = { id: 5, name: 'Due', data_type: 'date' }
  const fields = [due, formula(6, 'Days left', 'DAYS({Due}, TODAY())')]
  expect(computeFormulas(fields, { 5: '2026-11-11' }, NOW).get(6)).toEqual({ value: 10 })
})

test('a problem is reported for that cell only', () => {
  const fields = [price, formula(3, 'Per unit', '10 / {Price}'), formula(4, 'Doubled', '{Price} * 2')]
  const results = computeFormulas(fields, { 1: 0 }, NOW)
  expect(results.get(3)).toEqual({ error: '#DIV/0!', message: 'Cannot divide by zero' })
  expect(results.get(4)).toEqual({ value: 0 })
})

test('errors pass on to formulas that use the failing field', () => {
  const fields = [price, formula(3, 'Per unit', '10 / {Price}'), formula(4, 'Plus one', '{Per unit} + 1')]
  expect(computeFormulas(fields, { 1: 0 }, NOW).get(4)).toEqual({ error: '#DIV/0!', message: 'Cannot divide by zero' })
  const guarded = [price, formula(3, 'Per unit', '10 / {Price}'), formula(4, 'Safe', 'IFERROR({Per unit}, 0)')]
  expect(computeFormulas(guarded, { 1: 0 }, NOW).get(4)).toEqual({ value: 0 })
})

test('a missing field, an empty formula and a syntax error each give an error', () => {
  const fields = [price, formula(3, 'A', '{Gone} + 1'), formula(4, 'B', ''), formula(5, 'C', '1 +'), { id: 6, name: 'D', data_type: 'formula', formula: null }]
  const results = computeFormulas(fields, { 1: 1 }, NOW)
  expect(results.get(3)).toEqual({ error: '#REF!', message: 'There is no field named {Gone}' })
  expect(results.get(4)).toMatchObject({ error: '#ERROR!' })
  expect(results.get(5)).toMatchObject({ error: '#ERROR!' })
  expect(results.get(6)).toMatchObject({ error: '#ERROR!' })
})

test('formulas that depend on each other show #CIRC! instead of hanging', () => {
  const fields = [formula(1, 'A', '{B} + 1'), formula(2, 'B', '{A} + 1')]
  const results = computeFormulas(fields, {}, NOW)
  expect(results.get(1)).toMatchObject({ error: '#CIRC!' })
  expect(results.get(2)).toMatchObject({ error: '#CIRC!' })
})

test('results read as cells do', () => {
  expect(formatResult({ value: 10 })).toBe('10')
  expect(formatResult({ value: 0.1 + 0.2 })).toBe('0.3')
  expect(formatResult({ value: true })).toBe('TRUE')
  expect(formatResult({ value: null })).toBe('')
  expect(formatResult({ value: 'text' })).toBe('text')
  expect(formatResult({ error: '#DIV/0!', message: 'Cannot divide by zero' })).toBe('#DIV/0!')
})

test('checkFormula accepts a good formula and explains a bad one', () => {
  const others = [price, quantity]
  expect(checkFormula('Total', '{Price} * {Quantity}', others)).toBeNull()
  expect(checkFormula('Total', '{Price} *', others)).toContain('The formula ends too early')
  expect(checkFormula('Total', '', others)).toBe('The formula is empty')
  expect(checkFormula('Total', 'NOPE(1)', others)).toBe('There is no function called NOPE')
  expect(checkFormula('Total', '{Cost} * 2', others)).toBe('There is no field named {Cost}')
  expect(checkFormula('Total', '{Total} * 2', others)).toBe('A formula cannot refer to its own field')
  expect(checkFormula('Total', '1'.repeat(1001), others)).toContain('1000 characters')
})

test('checkFormula refuses a formula that would make a loop', () => {
  const others = [price, formula(2, 'Tax', '{Total} * 0.2'), formula(3, 'Net', '{Tax} + 1')]
  expect(checkFormula('Total', '{Price} + {Net}', others)).toBe('That would make a loop: {Tax} already uses this field')
  expect(checkFormula('Total', '{Price} + 1', others)).toBeNull()
})

test('checkFormula copes with other formulas that are themselves broken', () => {
  const others = [price, formula(2, 'Broken', '1 +')]
  expect(checkFormula('Total', '{Broken}', others)).toBeNull()
})

test('only formula fields are formula fields', () => {
  expect(isFormulaField(price)).toBe(false)
  expect(isFormulaField(formula(3, 'Total', '1'))).toBe(true)
})

test('the help text lists the operators and functions', () => {
  expect(FORMULA_HELP).toContain('{Field name}')
  expect(FORMULA_HELP).toContain('ROUND')
})
