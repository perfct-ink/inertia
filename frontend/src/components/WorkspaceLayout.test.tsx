import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WorkspaceLayout from './WorkspaceLayout'

jest.mock('@/components/file-manager/Sidebar', () => () => <nav data-testid="sidebar" />)
jest.mock('@/components/TabBar', () => () => <nav data-testid="tabs" />)

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
