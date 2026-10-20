import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import FileCell from './FileCell'

jest.mock('@/lib/api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }))

const files = [
  { id: 1, title: 'cover.png', doc_type: 'file', file: { url: '/blob/1', content_type: 'image/png', filename: 'cover.png', byte_size: 1 } },
  { id: 2, title: 'spec.pdf', doc_type: 'file', file: { url: '/blob/2', content_type: 'application/pdf', filename: 'spec.pdf', byte_size: 1 } },
] as never[]

test('a single file shows its thumbnail and changes through a menu, which can clear it', () => {
  const onChange = jest.fn()
  render(<FileCell label="Cover" many={false} value={1} files={files} onChange={onChange} />)
  expect(screen.getByRole('img', { name: 'cover.png' })).toHaveAttribute('src', 'http://api.test/blob/1')
  fireEvent.change(screen.getByLabelText('Cover'), { target: { value: '2' } })
  expect(onChange).toHaveBeenCalledWith(2)
  fireEvent.change(screen.getByLabelText('Cover'), { target: { value: '' } })
  expect(onChange).toHaveBeenCalledWith(null)
})

test('several files are chosen with checkboxes, and an empty choice is null', () => {
  const onChange = jest.fn()
  render(<FileCell label="Shots" many value={[1]} files={files} onChange={onChange} />)
  expect(screen.getByText('1 chosen')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('checkbox', { name: 'spec.pdf' }))
  expect(onChange).toHaveBeenCalledWith([1, 2])
  fireEvent.click(screen.getByRole('checkbox', { name: 'cover.png' }))
  expect(onChange).toHaveBeenLastCalledWith(null)
})

test('says when there are no uploaded files to choose from', () => {
  render(<FileCell label="Cover" many={false} value={null} files={[]} onChange={jest.fn()} />)
  expect(screen.getByRole('option', { name: 'No uploaded files yet' })).toBeInTheDocument()
})
