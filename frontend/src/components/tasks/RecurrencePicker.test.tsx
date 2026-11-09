import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { RecurrencePicker } from './RecurrencePicker'

test('offers the repeat rules, with the "none" entry worded by the caller', () => {
  render(<RecurrencePicker emptyLabel="Not ongoing" aria-label="Schedule" value="" onChange={jest.fn()} />)
  const options = Array.from(screen.getByLabelText('Schedule').querySelectorAll('option')).map((o) => [o.value, o.textContent])
  expect(options).toEqual([
    ['', 'Not ongoing'],
    ['FREQ=DAILY', 'Daily'],
    ['FREQ=WEEKLY', 'Weekly'],
    ['FREQ=WEEKLY;INTERVAL=2', 'Every 2 weeks'],
    ['FREQ=MONTHLY', 'Monthly'],
    ['FREQ=YEARLY', 'Yearly'],
  ])
})

test('reports the rule that was picked', () => {
  const picked: string[] = []
  render(<RecurrencePicker emptyLabel="Does not repeat" aria-label="Repeat" value="" onChange={(e) => picked.push(e.target.value)} />)
  fireEvent.change(screen.getByLabelText('Repeat'), { target: { value: 'FREQ=MONTHLY' } })
  expect(picked).toEqual(['FREQ=MONTHLY'])
})

test('keeps a rule the list does not offer, so the picker shows what is saved', () => {
  render(<RecurrencePicker emptyLabel="Not ongoing" aria-label="Schedule" value="FREQ=DAILY;INTERVAL=3" onChange={jest.fn()} />)
  const select = screen.getByLabelText('Schedule')
  expect(select).toHaveValue('FREQ=DAILY;INTERVAL=3')
  expect(select.querySelector('option[value="FREQ=DAILY;INTERVAL=3"]')).toHaveTextContent('Every 3 days')
})
