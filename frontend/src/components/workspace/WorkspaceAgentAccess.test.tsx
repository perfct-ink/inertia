import '@testing-library/jest-dom'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { AxiosError, type AxiosResponse } from 'axios'
import { WorkspaceAgentAccess } from './WorkspaceAgentAccess'
import type { AgentActivity, AgentToken } from '@/data/agentToken'
import type { Workspace } from '@/types'

let mockTokens: AgentToken[]
let mockActivities: AgentActivity[]
let mockActivityOf: number | null | undefined
const mockCreate = { mutate: jest.fn(), isPending: false }
const mockRevoke = { mutate: jest.fn() }
jest.mock('@/api/agentTokens', () => ({
  useAgentTokens: () => ({ data: mockTokens }),
  useAgentActivities: (id: number | null) => { mockActivityOf = id; return { data: mockActivities } },
  useCreateAgentToken: () => mockCreate,
  useRevokeAgentToken: () => mockRevoke,
}))

const workspace = {
  id: 1, name: 'Acme', personal: false, role: 'owner',
  folders: [{ id: 10, name: 'Root', root: true, parent_id: null, position: 0, children: [{ id: 11, name: 'Product', root: false, parent_id: 10, position: 0, children: [] }] }],
} as unknown as Workspace

const token = (over: Partial<AgentToken>): AgentToken => ({
  id: 1, name: 'Claude Code', permission: 'write', token_prefix: 'inertia_agent_ab', folder_id: null,
  revoked_at: null, last_used_at: null, created_at: '2026-11-01T10:00:00Z', created_by_name: 'Alex', ...over,
})

const renderIt = () => render(<WorkspaceAgentAccess workspace={workspace} open onClose={jest.fn()} />)

beforeEach(() => {
  mockTokens = []
  mockActivities = []
  mockActivityOf = undefined
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockResolvedValue(undefined) } })
})
afterEach(() => jest.clearAllMocks())

test('with no tokens it says so, and offers the form', () => {
  renderIt()
  expect(screen.getByRole('dialog', { name: 'Agent access in Acme' })).toBeInTheDocument()
  expect(screen.getByText('No agent tokens yet.')).toBeInTheDocument()
  expect(screen.getByText('No agent has changed anything yet.')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'New token' })).toBeInTheDocument()
})

test('lists each token with its permission, scope, maker and last use; revoked ones last and greyed', () => {
  mockTokens = [
    token({ id: 1, name: 'Old agent', revoked_at: '2026-11-04T00:00:00', created_at: '2026-10-01T00:00:00Z' }),
    token({ id: 2, name: 'Docs agent', permission: 'read', folder_id: 11, last_used_at: '2026-11-05T15:30:00' }),
  ]
  renderIt()
  const items = within(screen.getByRole('list', { name: 'Agent tokens' })).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Docs agent')
  expect(items[0]).toHaveTextContent('Read only · Product')
  expect(items[0]).toHaveTextContent('Made by Alex · Last used Nov 5, 2026 3:30 PM')
  expect(items[1]).toHaveTextContent('Old agent')
  expect(items[1]).toHaveTextContent('Revoked Nov 4, 2026')
  expect(items[1]).toHaveClass('workspace_agent_access-token--revoked')
  expect(within(items[1]).queryByRole('button', { name: /Revoke/ })).not.toBeInTheDocument()
})

test('a token needs a name', () => {
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'New token' }))
  expect(mockCreate.mutate).not.toHaveBeenCalled()
  expect(screen.getByRole('alert')).toHaveTextContent('Give the token a name.')
})

test('making a token sends the name, permission and folder, then shows the token once with copy buttons', async () => {
  const made = { ...token({ id: 3, name: 'CI' }), token: 'inertia_agent_secret', mcp_url: 'https://app.test/mcp' }
  mockCreate.mutate.mockImplementation((_data, callbacks) => callbacks.onSuccess(made))
  renderIt()
  fireEvent.change(screen.getByLabelText('Token name'), { target: { value: '  CI  ' } })
  fireEvent.change(screen.getByLabelText('Permission'), { target: { value: 'read' } })
  fireEvent.change(screen.getByLabelText('Limited to'), { target: { value: '11' } })
  fireEvent.click(screen.getByRole('button', { name: 'New token' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'CI', permission: 'read', folder_id: 11 }, expect.any(Object))

  expect(screen.getByRole('status')).toHaveTextContent('It cannot be shown again')
  expect(screen.getByLabelText('Token')).toHaveValue('inertia_agent_secret')
  expect(screen.getByLabelText('MCP URL')).toHaveValue('https://app.test/mcp')
  expect(screen.getByLabelText('Claude Code command')).toHaveValue('claude mcp add --transport http inertia https://app.test/mcp --header "Authorization: Bearer inertia_agent_secret"')

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Copy token' })) })
  expect(navigator.clipboard.writeText).toHaveBeenCalledWith('inertia_agent_secret')
  expect(screen.getByRole('button', { name: 'Copy token' })).toHaveTextContent('Copied')

  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(screen.queryByLabelText('Token')).not.toBeInTheDocument()
  expect(screen.queryByText('inertia_agent_secret')).not.toBeInTheDocument()
})

test('the folder choices are the Space\'s folders by path', () => {
  renderIt()
  const options = within(screen.getByLabelText('Limited to')).getAllByRole('option').map((o) => o.textContent)
  expect(options).toEqual(['Whole Space', 'Top level', 'Product'])
})

test('a refused token shows the server\'s message', () => {
  const response = { status: 422, data: { errors: ['Name has already been taken'] } } as AxiosResponse
  mockCreate.mutate.mockImplementation((_data, callbacks) => callbacks.onError(new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)))
  renderIt()
  fireEvent.change(screen.getByLabelText('Token name'), { target: { value: 'CI' } })
  fireEvent.click(screen.getByRole('button', { name: 'New token' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Name has already been taken')
})

test('Revoke asks first with the shared confirm dialog, and revokes once confirmed', () => {
  mockTokens = [token({ id: 7, name: 'Docs agent' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke Docs agent' }))
  expect(screen.getByText('Revoke Docs agent?')).toBeInTheDocument()
  expect(mockRevoke.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke token' }))
  expect(mockRevoke.mutate).toHaveBeenCalledWith(7, expect.any(Object))
})

test('cancelling the confirmation revokes nothing', () => {
  mockTokens = [token({ id: 7, name: 'Docs agent' })]
  renderIt()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke Docs agent' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(mockRevoke.mutate).not.toHaveBeenCalled()
})

test('activity names the agent, newest first, and a token\'s Activity button narrows it', () => {
  mockTokens = [token({ id: 7, name: 'Docs agent' })]
  mockActivities = [
    { id: 1, action: 'update', summary: 'moved a task to Done', subject_type: 'Task', subject_id: 4, agent_token_id: 7, agent_name: 'Docs agent (agent)', created_at: '2026-11-05T10:00:00' },
    { id: 2, action: 'create', summary: 'added a task', subject_type: 'Task', subject_id: 5, agent_token_id: 7, agent_name: 'Docs agent (agent)', created_at: '2026-11-06T10:00:00' },
  ]
  renderIt()
  const items = within(screen.getByRole('list', { name: 'Agent activity' })).getAllByRole('listitem')
  expect(items[0]).toHaveTextContent('Docs agent (agent) added a task')
  expect(items[1]).toHaveTextContent('Docs agent (agent) moved a task to Done')
  expect(mockActivityOf).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Show activity of Docs agent' }))
  expect(mockActivityOf).toBe(7)
  expect(screen.getByLabelText('Show activity of')).toHaveValue('7')
})
