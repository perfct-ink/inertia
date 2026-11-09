import { fireEvent, render, screen } from '@testing-library/react'
import { CommentsButton } from './CommentsButton'

jest.mock('./Comments', () => ({ Comments: ({ type, id }: { type: string; id: number }) => `Thread for ${type} ${id}` }))

test('opens the item\'s conversation from a comment button', () => {
  render(<CommentsButton type="Epic" id={9} title="Onboarding" />)
  expect(screen.queryByText('Thread for Epic 9')).not.toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Comments on Onboarding' }))
  expect(screen.getByText('Thread for Epic 9')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
})

test('does not click through to a card the button sits inside', () => {
  const onCard = jest.fn()
  render(
    <div onClick={onCard}>
      <CommentsButton type="Task" id={1} title="Ship" />
    </div>
  )
  fireEvent.click(screen.getByRole('button', { name: 'Comments on Ship' }))
  expect(onCard).not.toHaveBeenCalled()
})
