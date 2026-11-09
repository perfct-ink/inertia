import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { TaskAutoFields } from './TaskAutoFields'

const now = new Date('2026-10-21T12:00:00Z')

test('shows the item ID, creator and when it was created and last updated', () => {
  render(<TaskAutoFields now={now} task={{ id: 12, created_by_name: 'Ada', created_at: '2026-10-19T12:00:00Z', updated_at: '2026-10-21T10:00:00Z' }} />)
  const list = screen.getByLabelText('Automatic fields')
  expect(list).toHaveTextContent('Item ID#12')
  expect(list).toHaveTextContent('Created byAda')
  expect(list).toHaveTextContent('Created2 days ago')
  expect(list).toHaveTextContent('Last updatedabout 2 hours ago')
})

test('leaves out what the server does not know, such as the creator of an older task', () => {
  render(<TaskAutoFields now={now} task={{ id: 3, created_by_name: null, created_at: '2026-10-19T12:00:00Z' }} />)
  expect(screen.queryByText('Created by')).not.toBeInTheDocument()
  expect(screen.queryByText('Last updated')).not.toBeInTheDocument()
  expect(screen.getByText('Item ID')).toBeInTheDocument()
  expect(screen.getByText('2 days ago')).toHaveAttribute('datetime', '2026-10-19T12:00:00Z')
})
