import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'
import PortfolioScreen from './PortfolioScreen'

jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: { to: string; children: React.ReactNode }) => <a href={to} {...props}>{children}</a>,
}))
let mockRows: unknown[]
jest.mock('@/api/portfolio', () => ({ usePortfolio: () => ({ data: mockRows, isLoading: false }) }))

const row = (id: number, name: string, extra = {}) => ({
  id, name, owner_id: null, owner_name: null, project_status: 'active', start_date: '2026-10-01', target_date: '2026-12-01',
  tasks_count: 4, done_tasks_count: 1, percent: 25, health: 'on_track', ...extra,
})

test('lists each project with owner, status, dates, progress and health', () => {
  mockRows = [row(2, 'Album', { owner_name: 'Pat', health: 'at_risk' })]
  render(<PortfolioScreen />)
  const tr = screen.getByRole('rowheader', { name: 'Album' }).parentElement as HTMLElement
  expect(within(tr).getByText('Pat')).toBeInTheDocument()
  expect(within(tr).getByText('Active')).toBeInTheDocument()
  expect(within(tr).getByText('1/4')).toBeInTheDocument()
  expect(within(tr).getByText('Oct 1, 2026 → Dec 1, 2026')).toBeInTheDocument()
  expect(within(tr).getByText('At risk')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Album' })).toHaveAttribute('href', '/folders/2?view=overview')
})

test('clicking a column sorts, and again reverses', () => {
  mockRows = [row(1, 'Beta', { percent: 10 }), row(2, 'Alpha', { percent: 90 })]
  render(<PortfolioScreen />)
  const names = () => screen.getAllByRole('rowheader').map((h) => h.textContent)
  expect(names()).toEqual(['Alpha', 'Beta'])
  fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
  expect(names()).toEqual(['Beta', 'Alpha'])
  fireEvent.click(screen.getByRole('button', { name: 'Progress' }))
  expect(names()).toEqual(['Alpha', 'Beta'])
})

test('with no projects it explains how to make one', () => {
  mockRows = []
  render(<PortfolioScreen />)
  expect(screen.getByText(/No projects yet/)).toBeInTheDocument()
})
