import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import WorkspaceScreen from './WorkspaceScreen'

let mockOnboarding = false
jest.mock('@/store/auth', () => ({ useAuthStore: () => 1 }))
jest.mock('@/store/onboarding', () => ({ useActiveOnboarding: () => mockOnboarding }))
jest.mock('@/components/WorkspaceLayout', () => function LayoutMock({ children }: { children: React.ReactNode }) { return <div>{children}</div> })
jest.mock('@/components/onboarding/GettingStarted', () => function GettingStartedMock() { return <p>Getting started</p> })
jest.mock('@/view/projects/ProjectsScreen', () => function ProjectsMock() { return <p>Projects home</p> })

test('the Space home is its projects', () => {
  mockOnboarding = false
  render(<WorkspaceScreen />)
  expect(screen.getByText('Projects home')).toBeInTheDocument()
})

test('a new user sees the getting-started steps first', () => {
  mockOnboarding = true
  render(<WorkspaceScreen />)
  expect(screen.getByText('Getting started')).toBeInTheDocument()
  expect(screen.queryByText('Projects home')).not.toBeInTheDocument()
})
