import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import ResourcesScreen from './ResourcesScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
jest.mock('@/store/auth', () => ({
  useAuthStore: (select: (s: { user: { id: number } }) => unknown) => select({ user: { id: 1 } }),
}))

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn() }
const mockDelete = { mutate: jest.fn() }
const mockCapacity = { mutate: jest.fn() }

const project = (id: number, name: string) => ({ id, name, kind: 'project', archived: false, documents: [], children: [] })
const mockWorkspace = {
  id: 7,
  role: 'owner',
  folders: [{ id: 1, name: 'Root', root: true, kind: 'folder', archived: false, documents: [], children: [project(2, 'Messages'), project(3, 'Billing')] }],
}
const member = (userId: number, name: string, capacity: number) =>
  ({ id: userId + 100, user_id: userId, role: 'member', weekly_capacity_hours: capacity, user: { id: userId, name, email: `${name}@example.com` } })
const allocation = (id: number, userId: number, folderId: number, hours: number, start: string | null = null) =>
  ({ id, user_id: userId, folder_id: folderId, hours_per_week: hours, start_date: start, end_date: null })

const mockMembers = [member(2, 'Ben', 20), member(1, 'Ada', 40)]
const mockAllocations = [allocation(1, 1, 2, 30), allocation(2, 1, 3, 20, '2026-11-09'), allocation(3, 2, 2, 10)]

jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: mockWorkspace, isLoading: false }),
}))
jest.mock('@/api/workspaces', () => ({
  canManageWorkspace: (role: string | null) => role === 'admin' || role === 'owner',
}))
jest.mock('@/api/workspaceMembers', () => ({
  useWorkspaceMembers: () => ({ data: mockMembers, isLoading: false }),
  useUpdateMemberCapacity: () => mockCapacity,
}))
jest.mock('@/api/resourceAllocations', () => ({
  useResourceAllocations: () => ({ data: mockAllocations, isLoading: false }),
  useCreateResourceAllocation: () => mockCreate,
  useUpdateResourceAllocation: () => mockUpdate,
  useDeleteResourceAllocation: () => mockDelete,
}))

// Wednesday 4 November 2026: the first week shown starts on Monday 2 November.
beforeAll(() => {
  jest.useFakeTimers()
  jest.setSystemTime(new Date(2026, 10, 4, 12))
})
afterAll(() => jest.useRealTimers())
beforeEach(() => {
  jest.clearAllMocks()
  mockWorkspace.role = 'owner'
})

test('shows each person\'s hours against their capacity and warns about any week over it', () => {
  render(<ResourcesScreen />)
  const ada = within(screen.getByRole('list', { name: /Hours per week for Ada/ }))
  expect(ada.getAllByRole('listitem')).toHaveLength(8)
  expect(ada.getByText('30 / 40 h')).toBeInTheDocument()
  expect(ada.getByText('10 h free')).toBeInTheDocument()
  expect(ada.getAllByText('Over by 10 h')).toHaveLength(7)

  const ben = within(screen.getByRole('list', { name: /Hours per week for Ben/ }))
  expect(ben.getAllByText('10 / 20 h')).toHaveLength(8)
  expect(ben.queryByText(/Over by/)).not.toBeInTheDocument()

  expect(screen.getByRole('status')).toHaveTextContent('Over capacity: Ada (7 weeks)')
  expect(screen.getByText('Ada (you)')).toBeInTheDocument()
})

test('an admin changes a person\'s weekly capacity, and a value outside a week is refused', () => {
  render(<ResourcesScreen />)
  const field = screen.getByLabelText('Weekly capacity in hours for Ben')
  fireEvent.change(field, { target: { value: '30' } })
  fireEvent.blur(field)
  expect(mockCapacity.mutate).toHaveBeenCalledWith({ id: 102, hours: 30 }, expect.anything())

  mockCapacity.mutate.mockClear()
  const again = screen.getByLabelText('Weekly capacity in hours for Ada')
  fireEvent.change(again, { target: { value: '500' } })
  fireEvent.blur(again)
  expect(mockCapacity.mutate).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Enter hours from 0 to 168.')
})

test('allocates a person to a project for some hours a week', () => {
  render(<ResourcesScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Allocate Ben' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Choose a project.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()

  fireEvent.change(screen.getByLabelText('Project for Ben'), { target: { value: '3' } })
  fireEvent.change(screen.getByLabelText('Hours per week to allocate Ben'), { target: { value: '12.5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Allocate Ben' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith(
    { user_id: 2, folder_id: 3, hours_per_week: 12.5, start_date: '2026-11-04', end_date: null },
    expect.anything(),
  )
})

test('changes the hours and dates of an allocation and removes it', () => {
  render(<ResourcesScreen />)
  const hours = screen.getByLabelText('Hours per week for Ada on Messages')
  fireEvent.change(hours, { target: { value: '35' } })
  fireEvent.blur(hours)
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, hours_per_week: 35 }, expect.anything())

  const start = screen.getByLabelText('Start date for Ada on Billing')
  fireEvent.change(start, { target: { value: '0002-11-16' } })
  expect(mockUpdate.mutate).toHaveBeenCalledTimes(1)
  fireEvent.change(start, { target: { value: '2026-11-16' } })
  expect(mockUpdate.mutate).toHaveBeenLastCalledWith({ id: 2, start_date: '2026-11-16' }, expect.anything())

  fireEvent.click(screen.getByRole('button', { name: 'Remove Ada on Messages' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})

test('a member who cannot manage the Space reads the plan without controls', () => {
  mockWorkspace.role = 'member'
  render(<ResourcesScreen />)
  expect(screen.getByText('Ben')).toBeInTheDocument()
  expect(screen.getByText('20 h/week capacity')).toBeInTheDocument()
  expect(screen.getByText(/30 h\/week · Ongoing/)).toBeInTheDocument()
  expect(screen.queryByLabelText('Weekly capacity in hours for Ben')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Allocate Ben' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
})

test('the Projects tab totals each project\'s hours and lists who is on it', () => {
  render(<ResourcesScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'Projects' }))
  expect(screen.getByRole('link', { name: 'Messages' })).toHaveAttribute('href', '/folders/2')
  const hours = within(screen.getByRole('list', { name: /Hours per week on Messages/ }))
  expect(hours.getAllByText('40 h')).toHaveLength(8)
  expect(hours.getAllByText('2 people')).toHaveLength(8)
  const people = within(screen.getByRole('list', { name: 'People on Messages' }))
  expect(people.getByText('Ada')).toBeInTheDocument()
  expect(people.getByText('Ben')).toBeInTheDocument()
})

test('moves the weeks shown earlier and later', () => {
  render(<ResourcesScreen />)
  expect(screen.getByText('Nov 2 to Dec 27')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'This week' })).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Later weeks' }))
  expect(screen.getByText('Nov 30 to Jan 24')).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'This week' }))
  expect(screen.getByText('Nov 2 to Dec 27')).toBeInTheDocument()
})
