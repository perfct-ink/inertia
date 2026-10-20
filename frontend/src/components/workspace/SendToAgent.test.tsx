import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { SendToAgent } from './SendToAgent'

const mockSend = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/agentHandoffs', () => ({
  useAgentHandoffs: () => ({ data: [{ id: 1, agent_name: 'Claude Code', status: 'working', sent_by_name: 'Alex', created_at: '2026-10-02T10:00:00Z', instruction: 'Build it' }] }),
  useSendToAgent: () => mockSend,
}))

afterEach(() => jest.clearAllMocks())

test('sends the instruction, then shows the prompt and connect command once and lists earlier handoffs', () => {
  mockSend.mutate.mockImplementation((_data, { onSuccess }) => onSuccess({ id: 2, prompt: 'Do the PRD', token: 'inertia_agent_SECRET', mcp_url: 'https://app.test/mcp' }))
  render(<SendToAgent subjectType="document" subjectId={7} title="PRD" />)
  fireEvent.click(screen.getByRole('button', { name: 'Send PRD to agent' }))
  expect(screen.getByText(/Agent connected/)).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Instruction'), { target: { value: ' Build this ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(mockSend.mutate).toHaveBeenCalledWith({ agent_name: 'Claude Code', instruction: 'Build this', permission: 'write' }, expect.anything())
  const message = screen.getByLabelText('Handoff for the agent') as HTMLTextAreaElement
  expect(message.value).toContain('Do the PRD')
  expect(message.value).toContain('Bearer inertia_agent_SECRET')
})

test('a failed send shows the error', () => {
  mockSend.mutate.mockImplementation((_data, { onError }) => onError(new Error('Nope')))
  render(<SendToAgent subjectType="folder" subjectId={3} title="Plans" />)
  fireEvent.click(screen.getByRole('button', { name: 'Send Plans to agent' }))
  fireEvent.click(screen.getByRole('button', { name: 'Send' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Unable to save. Please try again.')
})
