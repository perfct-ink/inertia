import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WorkspaceLayout from './WorkspaceLayout'

jest.mock('@/components/file-manager/Sidebar', () => () => <nav data-testid="sidebar" />)
jest.mock('@/components/TabBar', () => () => <nav data-testid="tabs" />)

afterEach(() => window.history.replaceState({}, '', '/'))

test('native editor keeps content and omits duplicate web navigation', () => {
  window.history.replaceState({}, '', '/?native=1#/documents/7')
  render(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByText('Editor')).toBeInTheDocument()
  expect(screen.queryByTestId('sidebar')).not.toBeInTheDocument()
  expect(screen.queryByTestId('tabs')).not.toBeInTheDocument()
})

test('normal web app retains navigation', () => {
  render(<WorkspaceLayout><p>Editor</p></WorkspaceLayout>)
  expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  expect(screen.getByTestId('tabs')).toBeInTheDocument()
})
