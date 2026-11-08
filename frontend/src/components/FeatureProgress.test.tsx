import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FeatureProgress from './FeatureProgress'

let mockEpics: unknown[] = []
jest.mock('@/api/epics', () => ({ useEpics: () => ({ data: mockEpics }) }))

const epic = (extra = {}) => ({ id: 4, title: 'Background images', document_id: 31, tasks_count: 4, done_tasks_count: 1, ...extra })

function renderHeader(docId = 31, tasksOnly = false, onToggle = jest.fn()) {
  render(
    <MemoryRouter>
      <FeatureProgress doc={{ id: docId, doc_type: 'document' }} tasksOnly={tasksOnly} onToggleTasksOnly={onToggle} />
    </MemoryRouter>
  )
  return onToggle
}

beforeEach(() => { mockEpics = [epic(), epic({ id: 5, title: 'Other', document_id: 99 })] })

test('shows the feature name, status and how many tasks are done', () => {
  renderHeader()
  expect(screen.getByRole('region', { name: 'Feature progress' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Background images' })).toHaveAttribute('href', '/plan?epic_id=4')
  expect(screen.getByText('Active')).toBeInTheDocument()
  expect(screen.getByText('1 of 4 tasks done')).toBeInTheDocument()
})

test('is done when every task is', () => {
  mockEpics = [epic({ done_tasks_count: 4 })]
  renderHeader()
  expect(screen.getByText('Done')).toBeInTheDocument()
  expect(screen.getByText('4 of 4 tasks done')).toBeInTheDocument()
})

test('hides the progress until the feature has a task', () => {
  mockEpics = [epic({ tasks_count: 0, done_tasks_count: 0 })]
  renderHeader()
  expect(screen.getByText('Planned')).toBeInTheDocument()
  expect(screen.queryByText(/tasks done/)).not.toBeInTheDocument()
})

test('shows nothing for a document that is not a feature requirements document', () => {
  const { container } = render(
    <MemoryRouter>
      <FeatureProgress doc={{ id: 7, doc_type: 'document' }} tasksOnly={false} onToggleTasksOnly={jest.fn()} />
    </MemoryRouter>
  )
  expect(container).toBeEmptyDOMElement()
})

test('shows nothing for a sheet that happens to share a feature document id', () => {
  const { container } = render(
    <MemoryRouter>
      <FeatureProgress doc={{ id: 31, doc_type: 'spreadsheet' }} tasksOnly={false} onToggleTasksOnly={jest.fn()} />
    </MemoryRouter>
  )
  expect(container).toBeEmptyDOMElement()
})

test('the Tasks only toggle reports its state and runs the handler', () => {
  const onToggle = renderHeader(31, true)
  const toggle = screen.getByRole('button', { name: 'Tasks only' })
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(toggle)
  expect(onToggle).toHaveBeenCalledTimes(1)
})

test('the toggle keeps its label when it is off', () => {
  renderHeader(31, false)
  expect(screen.getByRole('button', { name: 'Tasks only' })).toHaveAttribute('aria-pressed', 'false')
})
