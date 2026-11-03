import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import type { AutomationRule } from '@/data/automation'
import AutomationsScreen from './AutomationsScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })

const rule = (over: Partial<AutomationRule>): AutomationRule => ({
  id: 1, name: 'Done goes to Ada', enabled: true, trigger_type: 'task_status_changed', trigger_config: { to: 'done' },
  conditions: [{ field: 'priority', operator: 'in', value: ['high', 'urgent'] }],
  actions: [{ type: 'assign', config: { user_id: 7 } }],
  created_by_id: 1, created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z', ...over,
})

const member = (userId: number, name: string) => ({
  id: userId, role: 'member', user_id: userId, weekly_capacity_hours: 40, user: { id: userId, name, email: `${name.toLowerCase()}@example.com` },
})

let mockRules: AutomationRule[] = []
let mockRole: string | null = 'admin'
const mockMembers = [member(7, 'Ada'), member(9, 'Bo')]
const mockSettings = [{ id: 1, folder_id: null, status: 'todo', label: 'Next up', color: null }]
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockUpdate = { mutate: jest.fn(), isPending: false }
const mockDelete = { mutate: jest.fn() }
jest.mock('@/api/automationRules', () => ({
  useAutomationRules: () => ({ data: mockRules, isLoading: false }),
  useCreateAutomationRule: () => mockCreate,
  useUpdateAutomationRule: () => mockUpdate,
  useDeleteAutomationRule: () => mockDelete,
}))
jest.mock('@/api/workspace', () => ({
  useWorkspace: () => ({ data: { id: 1, name: 'Team', personal: false, role: mockRole, folders: [] } }),
}))
jest.mock('@/api/workspaceMembers', () => ({ useWorkspaceMembers: () => ({ data: mockMembers }) }))
jest.mock('@/api/taskStatusSettings', () => ({ useTaskStatusSettings: () => ({ data: mockSettings }) }))

beforeEach(() => {
  jest.clearAllMocks()
  mockRole = 'admin'
  mockRules = [
    rule({ id: 1 }),
    rule({
      id: 2, name: 'Reopened work is unassigned', enabled: false, trigger_config: { from: 'done', to: 'todo' }, conditions: [],
      actions: [{ type: 'assign', config: { user_id: null } }, { type: 'set_status', config: { value: 'in_review' } }],
    }),
  ]
})

test('lists each automation as when, if and then, in the Space\'s own status names', () => {
  render(<AutomationsScreen />)
  const first = screen.getByRole('article', { name: 'Done goes to Ada' })
  expect(within(first).getByText('On')).toBeInTheDocument()
  expect(within(first).getByText("a task's status changes to Done")).toBeInTheDocument()
  expect(within(first).getByText('Priority is any of High, Urgent')).toBeInTheDocument()
  expect(within(first).getByText('Assign to Ada')).toBeInTheDocument()

  const second = screen.getByRole('article', { name: 'Reopened work is unassigned' })
  expect(within(second).getByText('Off')).toBeInTheDocument()
  expect(within(second).getByText("a task's status changes from Done to Next up")).toBeInTheDocument()
  expect(within(second).queryByText('If')).not.toBeInTheDocument()
  expect(within(second).getByText('Assign to Unassigned, then Change status to In Review')).toBeInTheDocument()
})

test('a member can read the automations but not change them', () => {
  mockRole = 'member'
  render(<AutomationsScreen />)
  expect(screen.getByRole('article', { name: 'Done goes to Ada' })).toBeInTheDocument()
  expect(screen.getByText('Only admins and owners can change automations.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'New automation' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Turn off' })).not.toBeInTheDocument()
})

test('a viewer is told automations are for members and nothing is listed', () => {
  mockRole = 'viewer'
  render(<AutomationsScreen />)
  expect(screen.getByText('Automations are for the members of this Space.')).toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('an admin builds an automation from a trigger, a condition and an action', () => {
  render(<AutomationsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New automation' }))
  const form = screen.getByRole('form', { name: 'Automation' })

  fireEvent.click(within(form).getByRole('button', { name: 'Create automation' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Give the automation a name.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()

  fireEvent.change(within(form).getByLabelText('Name'), { target: { value: '  Finished work goes to Ada ' } })
  fireEvent.change(within(form).getByLabelText('Trigger to'), { target: { value: 'done' } })

  fireEvent.click(within(form).getByRole('button', { name: 'Add condition' }))
  fireEvent.change(within(form).getByLabelText('Condition 1 field'), { target: { value: 'priority' } })
  fireEvent.change(within(form).getByLabelText('Condition 1 comparison'), { target: { value: 'in' } })
  const values = within(form).getByRole('group', { name: 'Condition 1 values' })
  // The priority it started on is ticked; swap it for High and Urgent.
  fireEvent.click(within(values).getByRole('checkbox', { name: 'No priority' }))
  fireEvent.click(within(values).getByRole('checkbox', { name: 'Urgent' }))
  fireEvent.click(within(values).getByRole('checkbox', { name: 'High' }))

  fireEvent.change(within(form).getByLabelText('Action 1'), { target: { value: 'assign' } })
  fireEvent.change(within(form).getByLabelText('Action 1 person'), { target: { value: '7' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Create automation' }))

  expect(mockCreate.mutate).toHaveBeenCalledWith(
    {
      name: 'Finished work goes to Ada',
      trigger_type: 'task_status_changed',
      trigger_config: { to: 'done' },
      conditions: [{ field: 'priority', operator: 'in', value: ['high', 'urgent'] }],
      actions: [{ type: 'assign', config: { user_id: 7 } }],
    },
    expect.anything(),
  )
})

test('a condition on a person compares with is and is not only, and "is any of" needs a tick', () => {
  render(<AutomationsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New automation' }))
  const form = screen.getByRole('form', { name: 'Automation' })
  fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Rule' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Add condition' }))

  fireEvent.change(within(form).getByLabelText('Condition 1 field'), { target: { value: 'assignee_id' } })
  const comparison = within(form).getByLabelText('Condition 1 comparison')
  expect(within(comparison).getAllByRole('option').map((o) => o.textContent)).toEqual(['is', 'is not'])

  fireEvent.change(within(form).getByLabelText('Condition 1 field'), { target: { value: 'status' } })
  fireEvent.change(within(form).getByLabelText('Condition 1 comparison'), { target: { value: 'in' } })
  // The value it had is ticked; taking the tick away leaves nothing to match.
  const backlog = within(form).getByRole('checkbox', { name: 'Backlog' })
  expect(backlog).toBeChecked()
  fireEvent.click(backlog)
  fireEvent.click(within(form).getByRole('button', { name: 'Create automation' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Condition 1: tick the status values to match.')
  expect(mockCreate.mutate).not.toHaveBeenCalled()
})

test('conditions and extra actions can be removed, but a rule keeps its last action', () => {
  render(<AutomationsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New automation' }))
  const form = screen.getByRole('form', { name: 'Automation' })
  expect(within(form).getByText('No conditions: it runs every time.')).toBeInTheDocument()
  expect(within(form).queryByRole('button', { name: 'Remove action 1' })).not.toBeInTheDocument()

  fireEvent.click(within(form).getByRole('button', { name: 'Add condition' }))
  expect(within(form).queryByText('No conditions: it runs every time.')).not.toBeInTheDocument()
  fireEvent.click(within(form).getByRole('button', { name: 'Remove condition 1' }))
  expect(within(form).getByText('No conditions: it runs every time.')).toBeInTheDocument()

  fireEvent.click(within(form).getByRole('button', { name: 'Add action' }))
  expect(within(form).getByLabelText('Action 2')).toBeInTheDocument()
  fireEvent.click(within(form).getByRole('button', { name: 'Remove action 2' }))
  expect(within(form).queryByLabelText('Action 2')).not.toBeInTheDocument()
})

test('the add buttons disappear at the limits on conditions and actions', () => {
  render(<AutomationsScreen />)
  fireEvent.click(screen.getByRole('button', { name: 'New automation' }))
  const form = screen.getByRole('form', { name: 'Automation' })
  for (let i = 0; i < 4; i++) fireEvent.click(within(form).getByRole('button', { name: 'Add action' }))
  expect(within(form).getAllByLabelText(/^Action \d$/)).toHaveLength(5)
  expect(within(form).queryByRole('button', { name: 'Add action' })).not.toBeInTheDocument()
})

test('editing starts from the saved values and sends the changes', () => {
  render(<AutomationsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Done goes to Ada' })).getByRole('button', { name: 'Edit' }))
  const form = screen.getByRole('form', { name: 'Automation' })
  expect(within(form).getByLabelText('Name')).toHaveValue('Done goes to Ada')
  expect(within(form).getByLabelText('Trigger to')).toHaveValue('done')
  expect(within(form).getByLabelText('Action 1 person')).toHaveValue('7')

  fireEvent.change(within(form).getByLabelText('Action 1 person'), { target: { value: '9' } })
  fireEvent.click(within(form).getByRole('button', { name: 'Save changes' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith(
    expect.objectContaining({ id: 1, name: 'Done goes to Ada', actions: [{ type: 'assign', config: { user_id: 9 } }] }),
    expect.anything(),
  )
})

test('an automation is switched off and on from its card', () => {
  render(<AutomationsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Done goes to Ada' })).getByRole('button', { name: 'Turn off' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 1, enabled: false })
  fireEvent.click(within(screen.getByRole('article', { name: 'Reopened work is unassigned' })).getByRole('button', { name: 'Turn on' }))
  expect(mockUpdate.mutate).toHaveBeenCalledWith({ id: 2, enabled: true })
})

test('deleting asks first', () => {
  render(<AutomationsScreen />)
  fireEvent.click(within(screen.getByRole('article', { name: 'Done goes to Ada' })).getByRole('button', { name: 'Delete' }))
  const dialog = screen.getByRole('dialog', { name: 'Delete automation' })
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})

test('the empty state differs for people who can and cannot make automations', () => {
  mockRules = []
  render(<AutomationsScreen />)
  expect(screen.getByText(/No automations yet\. Make one/)).toBeInTheDocument()
})

test('a member sees who to ask when there are none', () => {
  mockRules = []
  mockRole = 'member'
  render(<AutomationsScreen />)
  expect(screen.getByText(/An admin of this Space can make them\./)).toBeInTheDocument()
})

test('at the limit the new button gives way to a note', () => {
  mockRules = Array.from({ length: 50 }, (_, i) => rule({ id: i + 1, name: `Rule ${i + 1}` }))
  render(<AutomationsScreen />)
  expect(screen.queryByRole('button', { name: 'New automation' })).not.toBeInTheDocument()
  expect(screen.getByText(/the most automations it can have \(50\)/)).toBeInTheDocument()
})
