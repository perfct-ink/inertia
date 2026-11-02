import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import FilesGallery from './FilesGallery'

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({ useNavigate: () => mockNavigate }))
jest.mock('@/lib/api', () => ({ __esModule: true, default: { defaults: { baseURL: 'http://api.test' } } }))
jest.mock('@/components/DocTypeIcon', () => function IconMock() { return <span data-testid="icon" /> })

const file = (id: number, title: string, content_type: string) =>
  ({ id, title, doc_type: 'file', updated_at: `2026-10-0${id}T00:00:00Z`, file: { url: `/blob/${id}`, filename: title, content_type, byte_size: 2048 } }) as never

test('shows image thumbnails and icons for other files, and opens a card', () => {
  render(<FilesGallery documents={[file(1, 'a.png', 'image/png'), file(2, 'b.zip', 'application/zip')]} />)
  const thumb = document.querySelector('img') as HTMLImageElement
  expect(thumb.src).toBe('http://api.test/blob/1')
  expect(screen.getAllByTestId('icon')).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Open b.zip' }))
  expect(mockNavigate).toHaveBeenCalledWith('/documents/2')
})

test('filters by kind', () => {
  render(<FilesGallery documents={[file(1, 'a.png', 'image/png'), file(2, 'b.pdf', 'application/pdf')]} />)
  fireEvent.click(screen.getByRole('button', { name: 'PDFs' }))
  expect(screen.queryByRole('button', { name: 'Open a.png' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Open b.pdf' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Videos' }))
  expect(screen.getByText(/No files here yet/)).toBeInTheDocument()
})
