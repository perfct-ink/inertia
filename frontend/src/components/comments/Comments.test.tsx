import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { Comments } from './Comments'
import type { ItemComment, WorkspaceMember } from '@/types'

let mockComments: ItemComment[]
let mockWorkspace: { id: number; role: string } | undefined
let mockMembers: WorkspaceMember[]
let mockLoading = false
let mockFailed = false
const mockCreate = { mutateAsync: jest.fn() }
const mockUpdate = { mutateAsync: jest.fn() }
const mockDelete = { mutate: jest.fn() }

jest.mock('@/api/comments', () => ({
  useComments: () => ({ data: mockComments, isLoading: mockLoading, isError: mockFailed }),
  useCreateComment: () => mockCreate,
  useUpdateComment: () => mockUpdate,
  useDeleteComment: () => mockDelete,
}))
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockWorkspace }) }))
jest.mock('@/api/workspaces', () => ({
  useWorkspaceMembers: () => ({ data: mockMembers }),
  canManageWorkspace: (role?: string | null) => role === 'admin' || role === 'owner',
  canWriteWorkspace: (role?: string | null) => !!role && role !== 'viewer',
}))
// Pat (id 1) is the signed-in user.
jest.mock('@/store/auth', () => ({
  useAuthStore: (select: (state: unknown) => unknown) => select({ user: { id: 1, name: 'Pat', email: 'pat@example.com' } }),
}))

const person = (id: number, name: string) => ({ id, name })
const member = (id: number, name: string): WorkspaceMember => ({
  id, role: 'member', user_id: id, user: { id, name, email: `${name.split(' ')[0].toLowerCase()}@example.com` },
})

function comment(id: number, extra: Partial<ItemComment> = {}): ItemComment {
  return {
    id, commentable_type: 'Task', commentable_id: 5, parent_id: null, body: `Comment ${id}`,
    author_id: 1, author: person(1, 'Pat'), mentioned_users: [], edited_at: null,
    created_at: `2026-11-01T10:0${id}:00Z`, ...extra,
  }
}

beforeEach(() => {
  mockComments = []
  mockWorkspace = { id: 1, role: 'member' }
  mockMembers = [member(1, 'Pat'), member(2, 'Sam Lee'), member(3, 'Vic')]
  mockLoading = false
  mockFailed = false
  mockCreate.mutateAsync.mockReset().mockResolvedValue({})
  mockUpdate.mutateAsync.mockReset().mockResolvedValue({})
  mockDelete.mutate.mockReset()
})

function typeInto(label: string, value: string) {
  const box = screen.getByRole('textbox', { name: label })
  fireEvent.focus(box)
  fireEvent.change(box, { target: { value } })
  return box as HTMLTextAreaElement
}

test('invites the first comment when there are none', () => {
  render(<Comments type="Task" id={5} />)
  expect(screen.getByText('No comments yet. Start the conversation.')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Add a comment' })).toBeInTheDocument()
})

test('shows a load failure inline', () => {
  mockFailed = true
  render(<Comments type="Task" id={5} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Comments could not be loaded.')
  expect(screen.queryByText(/No comments yet/)).not.toBeInTheDocument()
})

test('shows comments with replies, the edited mark and highlighted mentions', () => {
  mockComments = [
    comment(1, { body: 'Hi @Sam Lee, look', mentioned_users: [person(2, 'Sam Lee')], edited_at: '2026-11-01T11:00:00Z' }),
    comment(2, { parent_id: 1, author_id: 2, author: person(2, 'Sam Lee'), body: 'On it' }),
  ]
  render(<Comments type="Task" id={5} />)

  const thread = screen.getByRole('list', { name: 'Comments' })
  expect(within(thread).getByText('@Sam Lee')).toHaveClass('comments-mention')
  expect(within(thread).getByText('(edited)')).toBeInTheDocument()
  const replies = within(thread).getByRole('list', { name: 'Replies to Pat' })
  expect(within(replies).getByText('On it')).toBeInTheDocument()
})

test('shows a comment whose author is gone', () => {
  mockComments = [comment(1, { author_id: null, author: null })]
  render(<Comments type="Task" id={5} />)
  expect(screen.getByText('Deleted user')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Edit comment by Deleted user' })).not.toBeInTheDocument()
})

test('posts a comment, suggesting members after an @ and sending who was mentioned', async () => {
  render(<Comments type="Task" id={5} />)
  const box = typeInto('Add a comment', 'Hi @sa')

  const options = screen.getAllByRole('option')
  expect(options).toHaveLength(1)
  expect(options[0]).toHaveTextContent('Sam Lee')
  fireEvent.click(options[0])
  expect(box.value).toBe('Hi @Sam Lee ')
  expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

  fireEvent.change(box, { target: { value: 'Hi @Sam Lee please review' } })
  fireEvent.click(screen.getByRole('button', { name: 'Comment' }))

  await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
    commentable_type: 'Task', commentable_id: 5, body: 'Hi @Sam Lee please review', parent_id: undefined, mentioned_user_ids: [2],
  }))
  await waitFor(() => expect(box.value).toBe(''))
})

test('does not suggest the signed-in user and drops a mention when the name is removed', async () => {
  render(<Comments type="Task" id={5} />)
  typeInto('Add a comment', 'cc @')
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    'Sam Leesam@example.com', 'Vicvic@example.com',
  ])

  typeInto('Add a comment', 'cc nobody')
  fireEvent.click(screen.getByRole('button', { name: 'Comment' }))
  await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ body: 'cc nobody', mentioned_user_ids: [] })))
})

test('cannot post an empty comment', () => {
  render(<Comments type="Task" id={5} />)
  typeInto('Add a comment', '   ')
  expect(screen.getByRole('button', { name: 'Comment' })).toBeDisabled()
})

test('keeps the text when posting fails', async () => {
  mockCreate.mutateAsync.mockRejectedValue(new Error('nope'))
  render(<Comments type="Task" id={5} />)
  const box = typeInto('Add a comment', 'Do not lose me')
  fireEvent.click(screen.getByRole('button', { name: 'Comment' }))
  await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalled())
  await waitFor(() => expect(screen.getByRole('button', { name: 'Comment' })).not.toBeDisabled())
  expect(box.value).toBe('Do not lose me')
})

test('replies to a thread under its comment', async () => {
  mockComments = [comment(1)]
  render(<Comments type="Task" id={5} />)
  fireEvent.click(screen.getByRole('button', { name: 'Reply to Pat' }))
  typeInto('Reply', 'Agreed')
  fireEvent.click(screen.getByRole('button', { name: 'Reply' }))

  await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalledWith({
    commentable_type: 'Task', commentable_id: 5, body: 'Agreed', parent_id: 1, mentioned_user_ids: [],
  }))
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument())
})

test('the author edits their comment, keeping its mentions', async () => {
  mockComments = [comment(1, { body: 'Hi @Sam Lee', mentioned_users: [person(2, 'Sam Lee')] })]
  render(<Comments type="Task" id={5} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Pat' }))

  const box = screen.getByRole('textbox', { name: 'Edit comment by Pat' }) as HTMLTextAreaElement
  expect(box.value).toBe('Hi @Sam Lee')
  fireEvent.change(box, { target: { value: 'Hi @Sam Lee, thanks' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save' }))

  await waitFor(() => expect(mockUpdate.mutateAsync).toHaveBeenCalledWith({ id: 1, body: 'Hi @Sam Lee, thanks', mentioned_user_ids: [2] }))
  await waitFor(() => expect(screen.queryByRole('textbox', { name: 'Edit comment by Pat' })).not.toBeInTheDocument())
})

test('cancelling an edit leaves the comment alone', () => {
  mockComments = [comment(1)]
  render(<Comments type="Task" id={5} />)
  fireEvent.click(screen.getByRole('button', { name: 'Edit comment by Pat' }))
  fireEvent.click(within(screen.getByRole('list', { name: 'Comments' })).getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('textbox', { name: 'Edit comment by Pat' })).not.toBeInTheDocument()
  expect(mockUpdate.mutateAsync).not.toHaveBeenCalled()
})

test('deleting asks first, then removes the comment', () => {
  mockComments = [comment(1)]
  render(<Comments type="Task" id={5} />)
  fireEvent.click(screen.getByRole('button', { name: 'Delete comment by Pat' }))
  expect(mockDelete.mutate).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
  expect(mockDelete.mutate).toHaveBeenCalledWith(1)
})

test('others can only edit their own; an admin can delete anyone\'s', () => {
  mockComments = [comment(1, { author_id: 2, author: person(2, 'Sam Lee') })]
  const { unmount } = render(<Comments type="Task" id={5} />)
  expect(screen.queryByRole('button', { name: 'Edit comment by Sam Lee' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Delete comment by Sam Lee' })).not.toBeInTheDocument()
  unmount()

  mockWorkspace = { id: 1, role: 'admin' }
  render(<Comments type="Task" id={5} />)
  expect(screen.queryByRole('button', { name: 'Edit comment by Sam Lee' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Delete comment by Sam Lee' })).toBeInTheDocument()
})

test('viewers can read but not write', () => {
  mockWorkspace = { id: 1, role: 'viewer' }
  mockComments = [comment(1)]
  render(<Comments type="Task" id={5} />)
  expect(screen.getByText('Comment 1')).toBeInTheDocument()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /^(Reply|Edit|Delete) (to|comment)/ })).not.toBeInTheDocument()
  expect(screen.getByText('Viewers can read comments but not write them.')).toBeInTheDocument()
})

test('Ctrl+Enter posts from the keyboard', async () => {
  render(<Comments type="Task" id={5} />)
  const box = typeInto('Add a comment', 'Quick note')
  fireEvent.keyDown(box, { key: 'Enter', ctrlKey: true })
  await waitFor(() => expect(mockCreate.mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ body: 'Quick note' })))
})

test('arrow keys and Enter choose a suggestion', () => {
  render(<Comments type="Task" id={5} />)
  const box = typeInto('Add a comment', '@')
  fireEvent.keyDown(box, { key: 'ArrowDown' })
  expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true')
  fireEvent.keyDown(box, { key: 'Enter' })
  expect(box.value).toBe('@Vic ')
  expect(mockCreate.mutateAsync).not.toHaveBeenCalled()
})
