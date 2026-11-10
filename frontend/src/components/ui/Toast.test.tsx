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

describe('a notice someone is reading', () => {
  const wait = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

  test('stays while the pointer is over it and goes eight seconds after the pointer leaves', () => {
    jest.useFakeTimers()
    render(<ToastRegion />)
    notify('Read me')
    const toast = screen.getByRole('alert')
    wait(5000)
    fireEvent.pointerEnter(toast)
    wait(60_000)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.pointerLeave(toast)
    wait(7900)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    wait(200)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('stays while focus is inside it, even without the pointer, and restarts when focus leaves', () => {
    jest.useFakeTimers()
    render(<ToastRegion />)
    notify('Copy me')
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    fireEvent.focus(dismiss)
    wait(60_000)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.blur(dismiss)
    wait(7900)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    wait(200)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  test('moving focus between things inside the notice does not restart it', () => {
    jest.useFakeTimers()
    render(<ToastRegion />)
    notify('Inside')
    const toast = screen.getByRole('alert')
    const dismiss = screen.getByRole('button', { name: 'Dismiss' })
    fireEvent.focus(dismiss)
    fireEvent.blur(dismiss, { relatedTarget: toast.querySelector('p') })
    wait(60_000)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  test('Dismiss still removes it at once', () => {
    render(<ToastRegion />)
    notify('Gone')
    fireEvent.pointerEnter(screen.getByRole('alert'))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

test('the region is named for screen readers', () => {
  render(<ToastRegion />)
  notify('Hello')
  expect(screen.getByRole('region', { name: 'Notifications' })).toContainElement(screen.getByRole('alert'))
})
