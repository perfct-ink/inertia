import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import IoMapScreen from './IoMapScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
const mockCreate = { mutate: jest.fn() }
const mockUpdate = { mutate: jest.fn() }
const mockDelete = { mutate: jest.fn() }
let mockNodes: unknown[]
jest.mock('@/api/ioNodes', () => ({
  useIoNodes: () => ({ data: mockNodes, isLoading: false }),
  useCreateIoNode: () => mockCreate,
  useUpdateIoNode: () => mockUpdate,
  useDeleteIoNode: () => mockDelete,
}))
jest.mock('@/api/objectives', () => ({ useObjectives: () => ({ data: [{ id: 3, title: 'Grow' }] }) }))
jest.mock('@/api/initiatives', () => ({ useInitiatives: () => ({ data: [{ id: 5, title: 'Launch' }] }) }))

const node = (id: number, parent_id: number | null, kind: string, title: string, progress: number | null = null) =>
  ({ id, parent_id, kind, title, description: null, position: 0, objective_id: null, initiative_id: null, progress })

afterEach(() => jest.clearAllMocks())

test('an empty map asks for the goal first', () => {
  mockNodes = []
  render(<IoMapScreen />)
  fireEvent.change(screen.getByLabelText('Goal'), { target: { value: 'Be the default tool' } })
  fireEvent.click(screen.getByRole('button', { name: 'Add goal' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'Be the default tool' }, expect.anything())
})

test('shows goal, factors and conditions with progress, and adds a child under each level', () => {
  mockNodes = [node(1, null, 'goal', 'Default tool', 25), node(2, 1, 'csf', 'Fast', 50), node(3, 2, 'nc', 'Quick load')]
  render(<IoMapScreen />)
  expect(screen.getByRole('article', { name: 'Goal: Default tool' })).toBeInTheDocument()
  expect(screen.getByText('50%')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /Add critical success factor/ }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'New critical success factor', parent_id: 1 })
  fireEvent.click(screen.getByRole('button', { name: /Add necessary condition/ }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ title: 'New necessary condition', parent_id: 2 })
  expect(screen.getAllByRole('button', { name: /^Add / })).toHaveLength(2)
})

test('links a node to an objective or initiative, renames it (blank rejected) and deletes it', () => {
  mockNodes = [node(1, null, 'goal', 'Default tool')]
  render(<IoMapScreen />)
  fireEvent.change(screen.getByLabelText('Measured by for Default tool'), { target: { value: 'o:3' } })
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, objective_id: 3, initiative_id: null })

  const title = screen.getByLabelText('Title of Default tool')
  fireEvent.change(title, { target: { value: ' ' } })
  fireEvent.blur(title)
  expect(screen.getByText(/can.t be blank/)).toBeInTheDocument()
  fireEvent.change(title, { target: { value: 'North star' } })
  fireEvent.blur(title)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, title: 'North star' })

  fireEvent.click(screen.getByRole('button', { name: 'Delete Default tool' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})
