import '@testing-library/jest-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ShareDialog } from './ShareDialog'
import type { ShareLink, ShareTarget } from '@/data/share'

const mockCreate = { mutate: jest.fn(), isPending: false, isError: false, error: null as unknown }
const mockTurnOff = { mutate: jest.fn(), isError: false, error: null as unknown }
let mockLinks: { data: ShareLink[]; isLoading: boolean; isError: boolean; error: unknown }
let mockTarget: ShareTarget | undefined

jest.mock('@/api/shares', () => ({
  useShares: (target: ShareTarget) => { mockTarget = target; return mockLinks },
  useCreateShare: () => mockCreate,
  useDeleteShare: () => mockTurnOff,
}))

const link = (overrides: Partial<ShareLink> = {}): ShareLink => ({
  id: 1, token: 'tok123', permission: 'view', expires_at: null, created_at: '2026-11-03T10:00:00Z',
  shareable_type: 'Document', shareable_id: 7, ...overrides,
})
const document: ShareTarget = { kind: 'document', id: 7, name: 'Launch plan' }
const folder: ShareTarget = { kind: 'folder', id: 3, name: 'Plans' }

beforeEach(() => {
  mockLinks = { data: [], isLoading: false, isError: false, error: null }
  mockCreate.isError = false
  mockTurnOff.isError = false
})
afterEach(() => jest.clearAllMocks())

test('explains what a link does and asks the server about this document', () => {
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  expect(screen.getByRole('dialog', { name: 'Share “Launch plan”' })).toBeInTheDocument()
  expect(screen.getByText(/view only\. They don.t need an account/)).toBeInTheDocument()
  expect(screen.getByText('No links yet.')).toBeInTheDocument()
  expect(mockTarget).toEqual(document)
  expect(screen.queryByText(/Spreadsheets, Collections and files are left out/)).not.toBeInTheDocument()
})

test('a folder dialog says what a folder link leaves out', () => {
  render(<ShareDialog target={folder} onClose={jest.fn()} />)
  expect(screen.getByText(/Spreadsheets, Collections and files are left out/)).toBeInTheDocument()
})

test('creates a link that expires in 30 days by default', () => {
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /Create link/ }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ expires_in_days: '30' })
})

test('a link that never expires is a choice', () => {
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText('Link expires'), { target: { value: '' } })
  fireEvent.click(screen.getByRole('button', { name: /Create link/ }))
  expect(mockCreate.mutate).toHaveBeenCalledWith({ expires_in_days: '' })
})

test('lists each link with its address, that it is view only and when it expires', () => {
  mockLinks.data = [link(), link({ id: 2, token: 'tok456', expires_at: '2099-01-02T12:00:00Z' })]
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  const rows = within(screen.getByRole('list', { name: 'Share links' })).getAllByRole('listitem')
  expect(rows).toHaveLength(2)
  expect(within(rows[0]).getByLabelText('Share link')).toHaveValue(`${window.location.origin}/shared/tok123`)
  expect(within(rows[0]).getByText('View only · Never expires')).toBeInTheDocument()
  expect(within(rows[1]).getByText(/^View only · Expires Jan 2, 2099$/)).toBeInTheDocument()
})

test('copies the link and says so', async () => {
  const writeText = jest.fn().mockResolvedValue(undefined)
  Object.assign(navigator, { clipboard: { writeText } })
  mockLinks.data = [link()]
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  await waitFor(() => expect(screen.getByRole('button', { name: 'Link copied' })).toBeInTheDocument())
  expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/shared/tok123`)
})

test('tells the person to copy by hand when the browser refuses', async () => {
  Object.assign(navigator, { clipboard: { writeText: jest.fn().mockRejectedValue(new Error('denied')) } })
  mockLinks.data = [link()]
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Select the link and copy it')
})

test('turning a link off asks first, then revokes it', () => {
  mockLinks.data = [link({ id: 9 })]
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
  expect(mockTurnOff.mutate).not.toHaveBeenCalled()
  expect(screen.getByText('Turn off this link?')).toBeInTheDocument()
  // The row's button first, the confirmation's last.
  const buttons = screen.getAllByRole('button', { name: 'Turn off' })
  expect(buttons).toHaveLength(2)
  fireEvent.click(buttons[1])
  expect(mockTurnOff.mutate).toHaveBeenCalledWith(9)
})

test('shows a failed load instead of an empty list', () => {
  mockLinks = { data: [], isLoading: false, isError: true, error: new Error('boom') }
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

test('shows why a link could not be made', () => {
  mockCreate.isError = true
  mockCreate.error = new Error('Only documents can be shared')
  render(<ShareDialog target={document} onClose={jest.fn()} />)
  expect(screen.getByRole('alert')).toBeInTheDocument()
})

test('Done closes the dialog', () => {
  const onClose = jest.fn()
  render(<ShareDialog target={document} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Done' }))
  expect(onClose).toHaveBeenCalled()
})
