import { DEFAULT_LIST_STYLE, indentedListStyle, listAction, listStyleHtmlAttributes, listStyleOf } from './listStyle'

test('a list without a style, or with an unknown one, is a plain bullet list', () => {
  expect(DEFAULT_LIST_STYLE).toBe('bullet')
  expect(listStyleOf(undefined)).toBe('bullet')
  expect(listStyleOf(null)).toBe('bullet')
  expect(listStyleOf('bullet')).toBe('bullet')
  expect(listStyleOf('wavy')).toBe('bullet')
  expect(listStyleOf('dashed')).toBe('dashed')
})

test('only a dashed list writes an attribute to its HTML', () => {
  expect(listStyleHtmlAttributes('dashed')).toEqual({ 'data-list-style': 'dashed', role: 'list' })
  expect(listStyleHtmlAttributes('bullet')).toEqual({})
  expect(listStyleHtmlAttributes(undefined)).toEqual({})
})

test('choosing the style a list already has takes the item out of the list', () => {
  expect(listAction('bulletList', 'dashed', 'dashed')).toBe('unlist')
  expect(listAction('bulletList', 'bullet', 'bullet')).toBe('unlist')
})

test('choosing the other style changes the list in place', () => {
  expect(listAction('bulletList', 'bullet', 'dashed')).toBe('restyle')
  expect(listAction('bulletList', 'dashed', 'bullet')).toBe('restyle')
})

test('a numbered list becomes a bullet list of the chosen style', () => {
  expect(listAction('orderedList', 'bullet', 'dashed')).toBe('convert')
  expect(listAction('orderedList', 'bullet', 'bullet')).toBe('convert')
})

test('outside a bullet or numbered list, a new list is made', () => {
  expect(listAction(null, 'bullet', 'dashed')).toBe('wrap')
  expect(listAction('workspaceTaskList', 'bullet', 'dashed')).toBe('wrap')
})

test('a nested list holding only the indented item takes its parent list\'s style', () => {
  expect(indentedListStyle('dashed', 'bullet', 1)).toBe('dashed')
  expect(indentedListStyle('bullet', 'dashed', 1)).toBe('bullet')
})

test('a nested list that already had items keeps its own style', () => {
  expect(indentedListStyle('dashed', 'bullet', 2)).toBe('bullet')
  expect(indentedListStyle('bullet', 'dashed', 3)).toBe('dashed')
})
