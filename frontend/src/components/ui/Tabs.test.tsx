import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { Tab, Tabs } from './Tabs'

test('tabs are a labelled group of toggle buttons; the active one is pressed', () => {
  const pick = jest.fn()
  render(
    <Tabs label="Tasks view" className="extra">
      <Tab active onClick={() => pick('backlog')}>Backlog</Tab>
      <Tab active={false} onClick={() => pick('kanban')}>Workboard</Tab>
    </Tabs>,
  )
  const group = screen.getByRole('group', { name: 'Tasks view' })
  expect(group).toHaveClass('ui-tabs', 'extra')
  const backlog = screen.getByRole('button', { name: 'Backlog' })
  const workboard = screen.getByRole('button', { name: 'Workboard' })
  expect(backlog).toHaveAttribute('aria-pressed', 'true')
  expect(backlog).toHaveClass('ui-tab', 'ui-tab--active')
  expect(workboard).toHaveAttribute('aria-pressed', 'false')
  expect(workboard).toHaveClass('ui-tab')
  expect(workboard).not.toHaveClass('ui-tab--active')
  fireEvent.click(workboard)
  expect(pick).toHaveBeenCalledWith('kanban')
})

test('a tab never submits a form, and a segmented row has its own class', () => {
  const submit = jest.fn((e: { preventDefault: () => void }) => e.preventDefault())
  render(
    <form onSubmit={submit}>
      <Tabs label="Type" variant="segmented">
        <Tab active>Milestone</Tab>
        <Tab active={false}>Deadline</Tab>
      </Tabs>
    </form>,
  )
  expect(screen.getByRole('group', { name: 'Type' })).toHaveClass('ui-tabs', 'ui-tabs--segmented')
  expect(screen.getByRole('button', { name: 'Deadline' })).toHaveAttribute('type', 'button')
  fireEvent.click(screen.getByRole('button', { name: 'Deadline' }))
  expect(submit).not.toHaveBeenCalled()
})
