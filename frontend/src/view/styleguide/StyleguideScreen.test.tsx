import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { TASK_STATUS_COLORS, COLOR_LABEL } from '@/data/task_status'
import { useNotificationStore } from '@/store/notifications'
import StyleguideScreen from './StyleguideScreen'
import { SECTIONS } from './examples'

type Theme = 'light' | 'dark'
const THEMES: Theme[] = ['light', 'dark']

const panel = (section: string, theme: Theme) => screen.getByRole('group', { name: `${section}, ${theme} theme` })
const example = (section: string, theme: Theme, label: string) => within(panel(section, theme)).getByRole('group', { name: label })

afterEach(() => useNotificationStore.setState({ notifications: [] }))

test('has a view-styleguide root and a light and a dark panel for every section', () => {
  const { container } = render(<StyleguideScreen />)
  expect(container.firstElementChild).toHaveClass('view-styleguide')
  expect(screen.getByRole('heading', { level: 1, name: 'Component gallery' })).toBeInTheDocument()
  expect(document.title).toBe('Component gallery · Inertia')
  for (const { title } of SECTIONS) {
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    expect(panel(title, 'light')).toHaveAttribute('data-theme', 'light')
    expect(panel(title, 'dark')).toHaveAttribute('data-theme', 'dark')
  }
  expect(container.querySelectorAll('[data-theme]')).toHaveLength(SECTIONS.length * 2)
})

describe.each(THEMES)('the %s panels', (theme) => {
  beforeEach(() => { render(<StyleguideScreen />) })

  test('show every button variant, enabled and disabled', () => {
    for (const name of ['Primary', 'Secondary', 'Ghost', 'Destructive', 'Unstyled']) {
      expect(within(example('Buttons', theme, 'Variants')).getByRole('button', { name })).toBeEnabled()
      expect(within(example('Buttons', theme, 'Disabled')).getByRole('button', { name })).toBeDisabled()
    }
    expect(within(example('Buttons', theme, 'Links drawn as buttons')).getAllByRole('link')).toHaveLength(2)
  })

  test('show fields in their states', () => {
    const fields = panel('Fields', theme)
    expect(within(fields).getByRole('textbox', { name: 'Empty with placeholder' })).toHaveAttribute('placeholder', 'Placeholder')
    expect(within(fields).getByRole('textbox', { name: 'Disabled text' })).toBeDisabled()
    expect(within(fields).getByRole('textbox', { name: 'Invalid email' })).toBeInvalid()
    expect(within(fields).getByRole('alert')).toHaveTextContent('Enter a full email address.')
    expect(within(fields).getByRole('checkbox', { name: 'Checked' })).toBeChecked()
    expect(within(fields).getByRole('checkbox', { name: 'Disabled checkbox' })).toBeDisabled()
    expect(within(fields).getByRole('radio', { name: 'First choice' })).toBeChecked()
    expect(within(fields).getByRole('textbox', { name: 'Disabled notes' })).toBeDisabled()
  })

  test('show selects and date fields in their states', () => {
    const select = within(panel('Select', theme))
    expect(select.getByRole('combobox', { name: 'Status' })).toHaveValue('doing')
    expect(select.getByRole('combobox', { name: 'Disabled status' })).toBeDisabled()
    const dates = within(panel('Date picker', theme))
    expect(dates.getByRole('combobox', { name: 'Due date' })).toHaveValue('2026-11-03')
    expect(dates.getByRole('combobox', { name: 'Disabled date' })).toBeDisabled()
    expect(dates.getByRole('combobox', { name: 'Read-only date' })).toHaveAttribute('readonly')
  })

  test('show menus, dialog buttons and the feedback and status marks', () => {
    expect(within(panel('Menu', theme)).getByRole('button', { name: 'Choose a Space' })).toHaveAttribute('aria-haspopup', 'menu')
    expect(within(panel('Dialogs', theme)).getAllByRole('button')).toHaveLength(5)
    const feedback = within(panel('Feedback and status', theme))
    for (const health of ['On track', 'At risk', 'Off track']) expect(feedback.getByText(health)).toBeInTheDocument()
    for (const color of TASK_STATUS_COLORS) expect(feedback.getByText(COLOR_LABEL[color])).toBeInTheDocument()
    expect(within(panel('Attachment card', theme)).getByRole('group', { name: 'Attachment: Launch plan.pdf' })).toBeInTheDocument()
    expect(within(panel('Colors', theme)).getByText('primary')).toBeInTheDocument()
  })

  test('open a select list and a confirm dialog, which close again', () => {
    fireEvent.keyDown(within(panel('Select', theme)).getByRole('combobox', { name: 'Status' }), { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(within(panel('Select', theme)).getByRole('combobox', { name: 'Status' }), { key: 'Tab' })
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    fireEvent.click(within(panel('Dialogs', theme)).getByRole('button', { name: 'Confirm deletion' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this project?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

test('the toast button pushes an error notice for the toast region to show', () => {
  render(<StyleguideScreen />)
  fireEvent.click(within(panel('Feedback and status', 'dark')).getByRole('button', { name: 'Show an error toast' }))
  expect(useNotificationStore.getState().notifications.map((n) => n.message)).toEqual([expect.stringContaining('the server said no')])
})

test('the panel width control narrows every pair of panels to a phone', () => {
  const { container } = render(<StyleguideScreen />)
  expect(container.querySelectorAll('.styleguide-themes--phone')).toHaveLength(0)
  fireEvent.change(screen.getByRole('combobox', { name: 'Panel width' }), { target: { value: 'phone' } })
  expect(container.querySelectorAll('.styleguide-themes--phone')).toHaveLength(SECTIONS.length)
})
