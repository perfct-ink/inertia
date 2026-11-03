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
const mockCreateHoliday = { mutate: jest.fn(), isPending: false }
const mockUpdateHoliday = { mutate: jest.fn() }
const mockDeleteHoliday = { mutate: jest.fn() }
const mockCreateTimeOff = { mutate: jest.fn(), isPending: false }
const mockUpdateTimeOff = { mutate: jest.fn() }
const mockDeleteTimeOff = { mutate: jest.fn() }

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

const timeOff = (id: number, userId: number, start: string, end: string, note: string | null = null) =>
  ({ id, user_id: userId, start_date: start, end_date: end, note })
const holiday = (id: number, name: string, start: string, end: string) => ({ id, name, start_date: start, end_date: end })

const mockMembers = [member(2, 'Ben', 20), member(1, 'Ada', 40)]
const mockAllocations = [allocation(1, 1, 2, 30), allocation(2, 1, 3, 20, '2026-11-09'), allocation(3, 2, 2, 10)]
let mockTimeOffs: object[] = []
let mockHolidays: object[] = []

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
jest.mock('@/api/timeOffs', () => ({
  useTimeOffs: () => ({ data: mockTimeOffs, isLoading: false }),
  useCreateTimeOff: () => mockCreateTimeOff,
  useUpdateTimeOff: () => mockUpdateTimeOff,
  useDeleteTimeOff: () => mockDeleteTimeOff,
}))
jest.mock('@/api/holidays', () => ({
  useHolidays: () => ({ data: mockHolidays, isLoading: false }),
  useCreateHoliday: () => mockCreateHoliday,
  useUpdateHoliday: () => mockUpdateHoliday,
  useDeleteHoliday: () => mockDeleteHoliday,
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
  mockTimeOffs = []
  mockHolidays = []
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

test('time off lowers a person\'s capacity for its weeks and the week warns when the hours no longer fit', () => {
  // Ada is off Wednesday and Thursday of the first week: two fifths of 40 hours.
  mockTimeOffs = [timeOff(1, 1, '2026-11-04', '2026-11-05')]
  render(<ResourcesScreen />)
  const ada = within(screen.getByRole('list', { name: /Hours per week for Ada/ }))
  expect(ada.getByText('30 / 24 h')).toBeInTheDocument()
  expect(ada.getByText('Over by 6 h')).toBeInTheDocument()
  expect(ada.getByText('2 days off')).toBeInTheDocument()
  expect(ada.getByText('leave')).toBeInTheDocument()
  expect(ada.getAllByText('Over by 10 h')).toHaveLength(7)
  expect(screen.getByRole('status')).toHaveTextContent('Over capacity: Ada (8 weeks)')

  const ben = within(screen.getByRole('list', { name: /Hours per week for Ben/ }))
  expect(ben.queryByText(/days? off/)).not.toBeInTheDocument()
  expect(ben.getAllByText('10 / 20 h')).toHaveLength(8)
})

test('a holiday lowers everyone\'s capacity and names the holiday', () => {
  mockHolidays = [holiday(1, 'Founders day', '2026-11-04', '2026-11-04')]
  render(<ResourcesScreen />)
  const ben = within(screen.getByRole('list', { name: /Hours per week for Ben/ }))
  expect(ben.getByText('10 / 16 h')).toBeInTheDocument()
  expect(ben.getByText('1 day off')).toBeInTheDocument()
  expect(ben.getByText('Founders day')).toBeInTheDocument()

  const ada = within(screen.getByRole('list', { name: /Hours per week for Ada/ }))
  expect(ada.getByText('30 / 32 h')).toBeInTheDocument()
  expect(ada.getByText('2 h free')).toBeInTheDocument()
})

describe('Time off tab', () => {
  beforeEach(() => {
    mockHolidays = [holiday(1, 'Founders day', '2026-11-18', '2026-11-18')]
    mockTimeOffs = [timeOff(1, 1, '2026-11-04', '2026-11-06', 'Conference'), timeOff(2, 2, '2026-10-19', '2026-10-23')]
  })

  const openTab = () => fireEvent.click(screen.getByRole('button', { name: 'Time off' }))

  test('lists the holidays and the leave that has not finished, with the working days in each', () => {
    render(<ResourcesScreen />)
    openTab()
    const holidays = within(screen.getByRole('list', { name: 'Holidays' }))
    expect(holidays.getByDisplayValue('Founders day')).toBeInTheDocument()
    expect(holidays.getByText('1 working day')).toBeInTheDocument()

    const leave = within(screen.getByRole('list', { name: 'Time off' }))
    expect(leave.getAllByRole('listitem')).toHaveLength(1)
    expect(leave.getByText('Ada')).toBeInTheDocument()
    expect(leave.getByDisplayValue('Conference')).toBeInTheDocument()
    expect(leave.getByText('3 working days')).toBeInTheDocument()
  })

  test('an admin adds a holiday, with the end date defaulting to the start', () => {
    render(<ResourcesScreen />)
    openTab()
    fireEvent.click(screen.getByRole('button', { name: 'Add holiday' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a name for the holiday.')
    expect(mockCreateHoliday.mutate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Holiday name'), { target: { value: 'Summer day' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add holiday' }))
    expect(mockCreateHoliday.mutate).toHaveBeenCalledWith({ name: 'Summer day', start_date: '2026-11-04', end_date: '2026-11-04' }, expect.anything())
  })

  test('an admin records time off for a person', () => {
    render(<ResourcesScreen />)
    openTab()
    fireEvent.click(screen.getByRole('button', { name: 'Add time off' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a person.')
    expect(mockCreateTimeOff.mutate).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Person taking time off'), { target: { value: '2' } })
    fireEvent.change(screen.getByLabelText('Time off end date'), { target: { value: '2026-11-06' } })
    fireEvent.change(screen.getByLabelText('Time off note'), { target: { value: 'Trip' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add time off' }))
    expect(mockCreateTimeOff.mutate).toHaveBeenCalledWith(
      { user_id: 2, start_date: '2026-11-04', end_date: '2026-11-06', note: 'Trip' },
      expect.anything(),
    )
  })

  test('changes the dates and note of time off, refuses an end before the start, and removes it', () => {
    render(<ResourcesScreen />)
    openTab()
    const end = screen.getByLabelText('End date for Ada, Nov 4 to Nov 6, 2026')
    fireEvent.change(end, { target: { value: '2026-11-10' } })
    expect(mockUpdateTimeOff.mutate).toHaveBeenCalledWith({ id: 1, end_date: '2026-11-10' }, expect.anything())

    mockUpdateTimeOff.mutate.mockClear()
    fireEvent.change(screen.getByLabelText('End date for Ada, Nov 4 to Nov 6, 2026'), { target: { value: '2026-11-03' } })
    expect(mockUpdateTimeOff.mutate).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent("The end date can't be before the start date.")

    const note = screen.getByLabelText('Note for Ada, Nov 4 to Nov 6, 2026')
    fireEvent.change(note, { target: { value: 'Trip' } })
    fireEvent.blur(note)
    expect(mockUpdateTimeOff.mutate).toHaveBeenCalledWith({ id: 1, note: 'Trip' }, expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Ada, Nov 4 to Nov 6, 2026' }))
    expect(mockDeleteTimeOff.mutate).toHaveBeenCalledWith(1)
  })

  test('renames and removes a holiday', () => {
    render(<ResourcesScreen />)
    openTab()
    const name = screen.getByLabelText('Name of Founders day')
    fireEvent.change(name, { target: { value: 'Founders week' } })
    fireEvent.blur(name)
    expect(mockUpdateHoliday.mutate).toHaveBeenCalledWith({ id: 1, name: 'Founders week' }, expect.anything())

    fireEvent.click(screen.getByRole('button', { name: 'Remove Founders day, Nov 18, 2026' }))
    expect(mockDeleteHoliday.mutate).toHaveBeenCalledWith(1)
  })

  test('a member reads the holidays and leave without controls', () => {
    mockWorkspace.role = 'member'
    render(<ResourcesScreen />)
    openTab()
    expect(screen.getByText('Founders day')).toBeInTheDocument()
    expect(screen.getByText('Nov 4 to Nov 6, 2026 · 3 working days')).toBeInTheDocument()
    expect(screen.queryByLabelText('Holiday name')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Person taking time off')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remove/ })).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Conference')).not.toBeInTheDocument()
  })
})
