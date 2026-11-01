import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { Link, useLocation } from 'react-router-dom'
import AppRouter from './AppRouter'

function Probe() {
  const { pathname } = useLocation()
  return (
    <>
      <p data-testid="route">{pathname}</p>
      <Link to="/space">Go to space</Link>
    </>
  )
}

afterEach(() => window.history.replaceState(null, '', '/'))

test('web uses real paths with no hash', () => {
  window.history.replaceState(null, '', '/tasks')
  render(<AppRouter kind="browser"><Probe /></AppRouter>)
  expect(screen.getByTestId('route')).toHaveTextContent('/tasks')
  fireEvent.click(screen.getByText('Go to space'))
  expect(screen.getByTestId('route')).toHaveTextContent('/space')
  expect(window.location.pathname).toBe('/space')
  expect(window.location.hash).toBe('')
})

test('Electron and iOS keep the route in the hash', () => {
  window.history.replaceState(null, '', '/#/tasks')
  render(<AppRouter kind="hash"><Probe /></AppRouter>)
  expect(screen.getByTestId('route')).toHaveTextContent('/tasks')
  fireEvent.click(screen.getByText('Go to space'))
  expect(screen.getByTestId('route')).toHaveTextContent('/space')
  expect(window.location.hash).toBe('#/space')
})

test('defaults to real paths when served over http(s)', () => {
  window.history.replaceState(null, '', '/documents/7')
  render(<AppRouter><Probe /></AppRouter>)
  expect(screen.getByTestId('route')).toHaveTextContent('/documents/7')
})
