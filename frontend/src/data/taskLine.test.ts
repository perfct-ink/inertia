import { reconcileTitle, removedLineTaskIds, statusForCheckbox } from './taskLine'

test('the first time, matching texts agree and a difference is settled by the task', () => {
  expect(reconcileTitle('Write spec', 'Write spec', undefined)).toEqual({ action: 'none', value: 'Write spec', known: 'Write spec' })
  expect(reconcileTitle('Old', 'New', undefined)).toEqual({ action: 'toLine', value: 'New', known: 'New' })
})

test('editing the line pushes the new text to the task', () => {
  expect(reconcileTitle('Write the spec', 'Write spec', 'Write spec')).toEqual({ action: 'toTask', value: 'Write the spec', known: 'Write the spec' })
})

test('renaming the task elsewhere pulls the new title into the line', () => {
  expect(reconcileTitle('Write spec', 'Write the spec', 'Write spec')).toEqual({ action: 'toLine', value: 'Write the spec', known: 'Write the spec' })
})

test('when both changed, the task wins', () => {
  expect(reconcileTitle('Mine', 'Theirs', 'Original')).toEqual({ action: 'toLine', value: 'Theirs', known: 'Theirs' })
  expect(reconcileTitle('Same', 'Same', 'Original')).toEqual({ action: 'none', value: 'Same', known: 'Same' })
})

test('nothing changed, extra whitespace, and a blank line do nothing', () => {
  expect(reconcileTitle('Write spec', 'Write spec', 'Write spec').action).toBe('none')
  expect(reconcileTitle('  Write spec ', 'Write spec', 'Write spec').action).toBe('none')
  expect(reconcileTitle('   ', 'Write spec', 'Write spec')).toEqual({ action: 'none', value: 'Write spec', known: 'Write spec' })
})

test('removedLineTaskIds lists lines that went away while their task still exists', () => {
  expect(removedLineTaskIds(new Set([1, 2, 3]), new Set([1]), new Set([1, 2]))).toEqual([2])
  expect(removedLineTaskIds(new Set(), new Set([1]), new Set([1]))).toEqual([])
})

test('the checkbox maps to done or todo', () => {
  expect(statusForCheckbox(true)).toBe('done')
  expect(statusForCheckbox(false)).toBe('todo')
})
