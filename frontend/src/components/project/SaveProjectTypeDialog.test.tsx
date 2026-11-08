import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import SaveProjectTypeDialog from './SaveProjectTypeDialog'

const mockSave = { mutate: jest.fn(), isPending: false }
jest.mock('@/api/projectTypes', () => ({ useSaveProjectType: () => mockSave }))
jest.mock('@/util/errorMessage', () => ({ errorMessage: () => 'Name has already been taken' }))

const project = { id: 2, name: 'Album', kind: 'project' } as never
const onClose = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  mockSave.isPending = false
})

test('starts with the project name and saves the project as a type under the name typed', () => {
  render(<SaveProjectTypeDialog project={project} onClose={onClose} />)
  const name = screen.getByRole('textbox', { name: 'Type name' })
  expect(name).toHaveValue('Album')
  fireEvent.change(name, { target: { value: ' Release ' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save type' }))
  expect(mockSave.mutate).toHaveBeenCalledWith({ name: 'Release', from_folder_id: 2 }, expect.anything())

  act(() => mockSave.mutate.mock.calls[0][1].onSuccess())
  expect(onClose).toHaveBeenCalled()
})

test('needs a name', () => {
  render(<SaveProjectTypeDialog project={project} onClose={onClose} />)
  fireEvent.change(screen.getByRole('textbox', { name: 'Type name' }), { target: { value: ' ' } })
  expect(screen.getByRole('button', { name: 'Save type' })).toBeDisabled()
})

test('shows why it could not be saved and stays open', () => {
  render(<SaveProjectTypeDialog project={project} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Save type' }))
  act(() => mockSave.mutate.mock.calls[0][1].onError(new Error('boom')))
  expect(screen.getByRole('alert')).toHaveTextContent('Name has already been taken')
  expect(onClose).not.toHaveBeenCalled()
})

test('says it is saving, and Cancel closes without saving', () => {
  mockSave.isPending = true
  const { unmount } = render(<SaveProjectTypeDialog project={project} onClose={onClose} />)
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  unmount()
  mockSave.isPending = false
  render(<SaveProjectTypeDialog project={project} onClose={onClose} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(onClose).toHaveBeenCalled()
  expect(mockSave.mutate).not.toHaveBeenCalled()
})
