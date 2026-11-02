import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RetrospectiveBoardScreen from './RetrospectiveBoardScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockCreateCard = { mutate: jest.fn(), isPending: false }
const mockUpdateCard = { mutate: jest.fn() }
const mockDeleteCard = { mutate: jest.fn() }
const mockVote = { mutate: jest.fn(), isPending: false }
const mockMakeTask = { mutate: jest.fn(), isPending: false }
const mockUpdateRetro = { mutate: jest.fn() }
const mockDeleteRetro = { mutate: jest.fn() }
let mockBoard: { data?: unknown; isLoading: boolean; isError: boolean }
jest.mock('@/api/retrospectives', () => ({
  useRetrospectiveBoard: () => mockBoard,
  useUpdateRetrospective: () => mockUpdateRetro,
  useDeleteRetrospective: () => mockDeleteRetro,
}))
jest.mock('@/api/retroCards', () => ({
  useCreateRetroCard: () => mockCreateCard,
  useUpdateRetroCard: () => mockUpdateCard,
  useDeleteRetroCard: () => mockDeleteCard,
  useToggleRetroVote: () => mockVote,
  useMakeRetroTask: () => mockMakeTask,
}))
jest.mock('@/api/sprints', () => ({ useSprints: () => ({ data: [{ id: 7, title: 'Sprint 7' }] }) }))

const card = (id: number, column_key: string, over = {}) => ({
  id, retrospective_id: 1, column_key, body: `Card ${id}`, author_id: 1, task_id: null, votes_count: 0, voted: false,
  created_at: '', updated_at: '', ...over,
})

function board(cards: unknown[]) {
  return {
    id: 1, title: 'Sprint 7 retro', template: 'went_well', sprint_id: 7, created_by_id: 1,
    cards_count: cards.length, tasks_count: 0, created_at: '', updated_at: '', cards,
  }
}

function renderBoard() {
  return render(
    <MemoryRouter initialEntries={['/retrospectives/1']}>
      <Routes><Route path="/retrospectives/:id" element={<RetrospectiveBoardScreen />} /></Routes>
    </MemoryRouter>,
  )
}

const column = (name: string) => screen.getByRole('region', { name }) as HTMLElement

beforeEach(() => {
  mockBoard = { data: board([card(1, 'went_well'), card(2, 'to_improve', { votes_count: 2 }), card(3, 'action_items')]), isLoading: false, isError: false }
})
afterEach(() => jest.resetAllMocks())

test('shows the template columns with their cards, a prompt for an empty one and the sprint', () => {
  mockBoard = { data: board([card(1, 'went_well')]), isLoading: false, isError: false }
  renderBoard()
  expect(screen.getByRole('heading', { name: 'Sprint 7 retro' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Sprint 7' })).toHaveAttribute('href', '/tasks?view=kanban&sprint_id=7')
  expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Went well', 'To improve', 'Action items'])
  expect(within(column('Went well')).getByText('Card 1')).toBeInTheDocument()
  expect(within(column('To improve')).getByText('What slowed us down?')).toBeInTheDocument()
})

test('adds a card to the column it was typed in and clears the field once saved', () => {
  mockCreateCard.mutate.mockImplementation((_data, { onSuccess }) => onSuccess())
  renderBoard()
  const input = screen.getByLabelText('Add a card to To improve') as HTMLInputElement
  fireEvent.change(input, { target: { value: '  Flaky deploys  ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add card to To improve' }))
  expect(mockCreateCard.mutate).toHaveBeenCalledWith(
    { retrospective_id: 1, column_key: 'to_improve', body: 'Flaky deploys' },
    expect.anything(),
  )
  expect(input.value).toBe('')
})

test('keeps the text when saving fails, and never sends an empty card', () => {
  renderBoard()
  expect(screen.getByRole('button', { name: 'Add card to Went well' })).toBeDisabled()
  const input = screen.getByLabelText('Add a card to Went well') as HTMLInputElement
  fireEvent.change(input, { target: { value: 'Pairing' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add card to Went well' }))
  expect(mockCreateCard.mutate).toHaveBeenCalledTimes(1)
  expect(input.value).toBe('Pairing')
})

test('votes for a card and takes the vote back', () => {
  mockBoard = { data: board([card(1, 'went_well', { votes_count: 1 }), card(2, 'went_well', { votes_count: 3, voted: true })]), isLoading: false, isError: false }
  renderBoard()
  const mine = screen.getByRole('button', { name: 'Remove your vote from this card, 3 votes' })
  expect(mine).toHaveAttribute('aria-pressed', 'true')
  fireEvent.click(mine)
  expect(mockVote.mutate).toHaveBeenLastCalledWith({ id: 2, voted: true })

  const other = screen.getByRole('button', { name: 'Vote for this card, 1 vote' })
  expect(other).toHaveAttribute('aria-pressed', 'false')
  fireEvent.click(other)
  expect(mockVote.mutate).toHaveBeenLastCalledWith({ id: 1, voted: false })
})

test('sorting by votes puts the most voted card first', () => {
  mockBoard = { data: board([card(1, 'went_well', { votes_count: 0 }), card(2, 'went_well', { votes_count: 4 })]), isLoading: false, isError: false }
  renderBoard()
  const order = () => within(column('Went well')).getAllByRole('article').map((a) => a.textContent)
  expect(order()[0]).toContain('Card 1')
  const toggle = screen.getByRole('button', { name: 'Sort by votes' })
  fireEvent.click(toggle)
  expect(toggle).toHaveAttribute('aria-pressed', 'true')
  expect(order()[0]).toContain('Card 2')
})

test('moves a card to another column and deletes it', () => {
  renderBoard()
  const first = within(column('Went well')).getByRole('article')
  fireEvent.change(within(first).getByLabelText('Move card to column'), { target: { value: 'action_items' } })
  expect(mockUpdateCard.mutate).toHaveBeenCalledWith({ id: 1, column_key: 'action_items' })

  fireEvent.click(within(first).getByRole('button', { name: 'Delete card' }))
  expect(mockDeleteCard.mutate).toHaveBeenCalledWith(1)
})

test('only an action item can become a task, and once it has one it says so', () => {
  mockBoard = { data: board([card(1, 'went_well'), card(2, 'action_items'), card(3, 'action_items', { task_id: 9 })]), isLoading: false, isError: false }
  renderBoard()
  expect(screen.getAllByRole('button', { name: 'Create task' })).toHaveLength(1)
  expect(within(column('Went well')).queryByRole('button', { name: 'Create task' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Create task' }))
  expect(mockMakeTask.mutate).toHaveBeenCalledWith(2)
  expect(screen.getByText('Task created')).toBeInTheDocument()
})

test('says so when the board cannot be loaded', () => {
  mockBoard = { data: undefined, isLoading: false, isError: true }
  renderBoard()
  expect(screen.getByRole('alert')).toHaveTextContent('could not be loaded')
  expect(screen.getByRole('link', { name: 'All retrospectives' })).toHaveAttribute('href', '/retrospectives')
})
