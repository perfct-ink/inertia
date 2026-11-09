import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RetrospectivesScreen from './RetrospectivesScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

const mockCreate = { mutate: jest.fn(), isPending: false }
let mockRetros: unknown[]
jest.mock('@/api/retrospectives', () => ({
  useRetrospectives: () => ({ data: mockRetros, isLoading: false }),
  useCreateRetrospective: () => mockCreate,
}))
jest.mock('@/api/sprints', () => ({
  useSprints: () => ({
    data: [{ id: 7, title: 'Sprint 7' }, { id: 8, title: 'Sprint 8' }],
  }),
}))

const retro = (over = {}) => ({
  id: 1, title: 'Sprint 7 retrospective', template: 'went_well', sprint_id: 7, created_by_id: 1, cards_count: 5, tasks_count: 1,
  created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z', ...over,
})

beforeEach(() => { mockRetros = [retro()] })
afterEach(() => jest.resetAllMocks())

test('lists each board as a link with its template, sprint and counts', () => {
  render(<MemoryRouter><RetrospectivesScreen /></MemoryRouter>)
  const link = screen.getByRole('link', { name: /Sprint 7 retrospective/ })
  expect(link).toHaveAttribute('href', '/retrospectives/1')
  expect(link).toHaveTextContent('Went well, to improve, actions · Sprint 7')
  expect(link).toHaveTextContent('5 cards, 1 task')
})

test('an empty Space is told what a retrospective is', () => {
  mockRetros = []
  render(<MemoryRouter><RetrospectivesScreen /></MemoryRouter>)
  expect(screen.getByText(/No retrospectives yet/)).toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
})

test('creating a board sends the chosen template and sprint, then opens the board', () => {
  mockCreate.mutate.mockImplementation((_data, { onSuccess }) => onSuccess({ id: 42 }))
  render(<MemoryRouter><RetrospectivesScreen /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'New retrospective' }))

  fireEvent.change(screen.getByLabelText('Template'), { target: { value: 'four_ls' } })
  expect(screen.getByText(/Columns: Liked, Learned, Lacked, Longed for, Action items\./)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Sprint (optional)'), { target: { value: '8' } })
  // With no title typed, the title follows the sprint.
  expect(screen.getByLabelText('Title')).toHaveAttribute('placeholder', 'Sprint 8 retrospective')
  fireEvent.click(screen.getByRole('button', { name: 'Create board' }))

  expect(mockCreate.mutate).toHaveBeenCalledWith(
    { title: 'Sprint 8 retrospective', template: 'four_ls', sprint_id: 8 },
    expect.anything(),
  )
  expect(mockNavigate).toHaveBeenCalledWith('/retrospectives/42')
})

test('a typed title wins and no sprint is sent when none is chosen', () => {
  render(<MemoryRouter><RetrospectivesScreen /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'New retrospective' }))
  fireEvent.change(screen.getByLabelText('Title'), { target: { value: '  Launch retro  ' } })
  const dialog = screen.getByLabelText('Title').closest('form') as HTMLElement
  fireEvent.click(within(dialog).getByRole('button', { name: 'Create board' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith(
    { title: 'Launch retro', template: 'went_well', sprint_id: null },
    expect.anything(),
  )
})
