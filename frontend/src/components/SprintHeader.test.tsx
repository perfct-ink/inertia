import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import SprintHeader from './SprintHeader'

jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))

test('shows the sprint title, goal, dates and progress', () => {
  render(<SprintHeader sprint={{ id: 1, title: 'Sprint 4', goal: 'Ship onboarding', status: 'active', start_date: '2026-10-05', end_date: '2026-10-19', tasks_count: 4, done_tasks_count: 1 } as never} />)
  expect(screen.getByRole('heading', { name: 'Sprint 4' })).toBeInTheDocument()
  expect(screen.getByText('Ship onboarding')).toBeInTheDocument()
  expect(screen.getByText('Oct 5 → Oct 19')).toBeInTheDocument()
  expect(screen.getByText('1/4 tasks done')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'All sprints' })).toHaveAttribute('href', '/sprints')
})

test('leaves out a missing goal and dates', () => {
  render(<SprintHeader sprint={{ id: 1, title: 'S', goal: null, status: 'planned', start_date: null, end_date: null, tasks_count: 0, done_tasks_count: 0 } as never} />)
  expect(screen.queryByText(/→/)).not.toBeInTheDocument()
})
