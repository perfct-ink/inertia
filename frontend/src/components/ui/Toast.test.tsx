import '@testing-library/jest-dom'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { useNotificationStore } from '@/store/notifications'
import { ToastRegion } from './Toast'

const notify = (message: string) => act(() => useNotificationStore.getState().notify(message))

afterEach(() => {
  jest.useRealTimers()
  act(() => useNotificationStore.setState({ notifications: [] }))
})

test('draws nothing until there is a notice', () => {
  const { container } = render(<ToastRegion />)
  expect(container).toBeEmptyDOMElement()
})

test('shows each notice as an alert with a Dismiss button', () => {
  render(<ToastRegion />)
  notify("Couldn't save")
  notify("Couldn't move")
  expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(["Couldn't save", "Couldn't move"])
  expect(screen.getAllByRole('button', { name: 'Dismiss' })).toHaveLength(2)
})

test('Dismiss removes only that notice', () => {
  render(<ToastRegion />)
  notify('First')
  notify('Second')
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss' })[0])
  expect(screen.getAllByRole('alert').map((a) => a.textContent)).toEqual(['Second'])
})

test('a notice goes away by itself after eight seconds', () => {
  jest.useFakeTimers()
  render(<ToastRegion />)
  notify('Slow')
  act(() => { jest.advanceTimersByTime(7900) })
  expect(screen.getByRole('alert')).toBeInTheDocument()
  act(() => { jest.advanceTimersByTime(200) })
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})
