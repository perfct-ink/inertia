import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WorkspaceLayout from './WorkspaceLayout'

jest.mock('@/components/file-manager/Sidebar', () => function SidebarMock() { return <nav data-testid="sidebar" /> })
jest.mock('@/components/TabBar', () => function TabBarMock() { return <nav data-testid="tabs" /> })

let mockSpace: { name: string } | undefined
jest.mock('@/api/workspace', () => ({ useWorkspace: () => ({ data: mockSpace }) }))

beforeEach(() => { mockSpace = { name: 'Acme Studio' } })
afterEach(() => window.history.replaceState({}, '', '/'))

test('Mac workspace uses the existing sidebar and tabs even with a legacy native parameter', () => {
  window.history.replaceState({}, '', '/?native=1#/documents/7')
  render(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByText('Editor')).toBeInTheDocument()
  expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  expect(screen.getByTestId('tabs')).toBeInTheDocument()
})

test('normal web app retains navigation', () => {
  render(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  expect(screen.getByTestId('tabs')).toBeInTheDocument()
})

test('the mobile top bar shows the Space name, falling back to the app name while it loads', () => {
  const { rerender } = render(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByText('Acme Studio')).toBeInTheDocument()
  mockSpace = undefined
  rerender(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByText('Inertia')).toBeInTheDocument()
})
