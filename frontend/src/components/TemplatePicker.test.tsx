import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import TemplatePicker from './TemplatePicker'

const mockMutate = jest.fn()
let mockPending = false
jest.mock('@/api/templates', () => ({
  useApplyTemplate: () => ({ mutate: mockMutate, isPending: mockPending }),
}))
jest.mock('@/util/date', () => ({ ...jest.requireActual('@/util/date'), todayISO: () => '2026-11-02' }))

beforeEach(() => {
  mockPending = false
  mockMutate.mockReset()
})

function openPicker(kind: 'project' | 'roadmap' | 'sprint') {
  render(<TemplatePicker kind={kind} />)
  fireEvent.click(screen.getByRole('button', { name: 'From template' }))
}

test('the dialog lists the templates for its kind, with what each adds, and picks the first', () => {
  openPicker('project')
  expect(screen.getByRole('dialog', { name: 'New project from a template' })).toBeInTheDocument()
  expect(screen.getByRole('radio', { name: /Software project/ })).toBeChecked()
  expect(screen.getByRole('radio', { name: /Marketing campaign/ })).not.toBeChecked()
  expect(screen.getByText('Adds 3 files and 4 tasks')).toBeInTheDocument()
  expect(screen.queryByRole('radio', { name: /Two-week sprint/ })).not.toBeInTheDocument()
})

test('a project asks for a name only, and creates the project from the chosen template', () => {
  openPicker('project')
  expect(screen.queryByLabelText('Start date')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: /Event/ }))
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Launch party' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  expect(mockMutate).toHaveBeenCalledTimes(1)
  expect(mockMutate.mock.calls[0][0]).toMatchObject({ kind: 'project', folder: { name: 'Launch party', kind: 'project' } })
  expect(mockMutate.mock.calls[0][0].documents.map((d: { title: string }) => d.title)).toContain('Run of show')
})

test('an empty name uses the template name as a placeholder and as the default', () => {
  openPicker('project')
  expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Software project')
  fireEvent.click(screen.getByRole('button', { name: 'Create project' }))
  expect(mockMutate.mock.calls[0][0].folder.name).toBe('Software project')
})

test('a sprint starts today by default and dates its tasks from the start date', () => {
  openPicker('sprint')
  expect(screen.getByLabelText('Start date')).toHaveValue('2026-11-02')
  expect(screen.getByLabelText('Name')).toHaveAttribute('placeholder', 'Sprint starting Nov 2')
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '2026-11-09' } })
  fireEvent.click(screen.getByRole('button', { name: 'Create sprint' }))
  expect(mockMutate.mock.calls[0][0]).toMatchObject({
    kind: 'sprint',
    sprint: { title: 'Sprint starting Nov 9', start_date: '2026-11-09', end_date: '2026-11-22' },
  })
})

test('a roadmap asks for a start date, not a name', () => {
  openPicker('roadmap')
  expect(screen.queryByLabelText('Name')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Add roadmap' }))
  expect(mockMutate.mock.calls[0][0]).toMatchObject({ kind: 'roadmap' })
  expect(mockMutate.mock.calls[0][0].milestones[0].milestone.target_date).toBe('2026-11-23')
})

test('nothing is created without a start date', () => {
  openPicker('roadmap')
  fireEvent.change(screen.getByLabelText('Start date'), { target: { value: '' } })
  expect(screen.getByRole('button', { name: 'Add roadmap' })).toBeDisabled()
})

test('the dialog closes when the plan is carried out', () => {
  mockMutate.mockImplementation((_plan, options) => options.onSuccess())
  openPicker('sprint')
  fireEvent.click(screen.getByRole('button', { name: 'Create sprint' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})

test('a failure stays in the dialog as an alert', () => {
  mockMutate.mockImplementation((_plan, options) => options.onError(new Error('Title is required.')))
  openPicker('sprint')
  fireEvent.click(screen.getByRole('button', { name: 'Create sprint' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Title is required.')
  expect(screen.getByRole('dialog')).toBeInTheDocument()
})

test('while it works the buttons are off and the dialog cannot be cancelled', () => {
  mockPending = true
  openPicker('project')
  expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
})
