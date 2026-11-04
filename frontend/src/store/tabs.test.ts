import { useTabsStore } from './tabs'

beforeEach(() => useTabsStore.getState().reset())

test('reopening an open tab takes its new title', () => {
  const { openTab } = useTabsStore.getState()
  openTab({ id: '5', path: '/documents/5', title: 'Budget', docType: 'spreadsheet' })
  openTab({ id: '5', path: '/documents/5', title: 'Budget 2027', docType: 'spreadsheet' })
  expect(useTabsStore.getState().tabs).toEqual([{ id: '5', path: '/documents/5', title: 'Budget 2027', docType: 'spreadsheet' }])
})
