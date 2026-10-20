import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { AgentAccess } from './AgentAccess'

const mockCreate = { mutate: jest.fn(), isPending: false }
const mockRevoke = { mutate: jest.fn() }
jest.mock('@/api/agentTokens', () => ({
  useAgentTokens: () => ({ data: [
    { id: 1, name: 'Claude Code', permission: 'write', token_prefix: 'inertia_agent_ab12', folder_id: null, revoked_at: null, last_used_at: null, created_at: '2026-10-02T00:00:00Z' },
    { id: 2, name: 'Old', permission: 'read', token_prefix: 'inertia_agent_zz99', folder_id: 5, revoked_at: '2026-10-03T00:00:00Z', last_used_at: '2026-10-02T10:00:00Z', created_at: '2026-10-01T00:00:00Z' },
  ] }),
  useCreateAgentToken: () => mockCreate,
  useRevokeAgentToken: () => mockRevoke,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: { folders: [{ id: 1, name: 'Root', root: true, archived: false, children: [{ id: 5, name: 'Plans', archived: false, children: [], documents: [] }], documents: [] }] } }) }))

afterEach(() => jest.clearAllMocks())

test('lists tokens with their scope and revokes an active one', () => {
  render(<AgentAccess open onClose={jest.fn()} />)
  expect(screen.getByText(/Read and write, whole space/)).toBeInTheDocument()
  expect(screen.getByText(/Read only in Plans/)).toBeInTheDocument()
  expect(screen.getByText(/revoked/)).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Revoke Old' })).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Revoke Claude Code' }))
  expect(mockRevoke.mutate).toHaveBeenCalledWith(1, expect.anything())
})

test('creating a token sends the name, rights and folder, then shows the token and the Claude Code command once', () => {
  mockCreate.mutate.mockImplementation((_data, { onSuccess }) => onSuccess({ id: 3, name: 'New', token: 'inertia_agent_SECRET', mcp_url: 'https://app.test/mcp' }))
  render(<AgentAccess open onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Agent name'), { target: { value: ' New ' } })
  fireEvent.change(screen.getByLabelText('Agent permission'), { target: { value: 'write' } })
  fireEvent.change(screen.getByLabelText('Limit to a folder'), { target: { value: '5' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create token' }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ name: 'New', permission: 'write', folder_id: 5 }, expect.anything())
  expect(screen.getByLabelText('New agent token')).toHaveValue('inertia_agent_SECRET')
  expect(screen.getByLabelText('Claude Code command')).toHaveValue('claude mcp add --transport http inertia https://app.test/mcp --header "Authorization: Bearer inertia_agent_SECRET"')
})
