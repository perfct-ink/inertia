import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/react'
import OfflineIndicator from './OfflineIndicator'

function setOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { value, configurable: true })
  act(() => { window.dispatchEvent(new Event(value ? 'online' : 'offline')) })
}
afterEach(() => setOnline(true))

test('shows nothing while online', () => {
  render(<OfflineIndicator />)
  expect(screen.queryByText('Offline')).not.toBeInTheDocument()
})

test('shows Offline with an icon when the connection drops, and hides it when it returns', () => {
  render(<OfflineIndicator />)
  setOnline(false)
  expect(screen.getByRole('status')).toHaveTextContent('Offline')
  expect(screen.getByRole('status').querySelector('svg')).toBeInTheDocument()
  setOnline(true)
  expect(screen.queryByText('Offline')).not.toBeInTheDocument()
})

test('starts offline when the page loads without a connection', () => {
  Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
  render(<OfflineIndicator />)
  expect(screen.getByText('Offline')).toBeInTheDocument()
})
