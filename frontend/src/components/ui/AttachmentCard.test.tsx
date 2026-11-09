import { fireEvent, render, screen } from '@testing-library/react'
import { AttachmentCard } from './AttachmentCard'

const PDF = 'https://inertia.test/rails/active_storage/blobs/x/Plan.pdf'

test('a file card shows its name, type and size and links to a download', () => {
  render(<AttachmentCard name="Plan.pdf" url={PDF} type="application/pdf" size={2 * 1024 * 1024} />)
  expect(screen.getByRole('group', { name: 'Attachment: Plan.pdf' })).toBeInTheDocument()
  expect(screen.getByText('Plan.pdf')).toBeInTheDocument()
  expect(screen.getByText('PDF · 2 MB')).toBeInTheDocument()
  const download = screen.getByRole('link', { name: 'Download Plan.pdf' })
  expect(download).toHaveAttribute('href', `${PDF}?disposition=attachment`)
  expect(download).toHaveAttribute('download', 'Plan.pdf')
})

test('a PDF opens a preview in a dialog', () => {
  render(<AttachmentCard name="Plan.pdf" url={PDF} type="application/pdf" />)
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Preview' }))
  expect(screen.getByRole('dialog')).toBeInTheDocument()
  expect(screen.getByTitle('Preview of Plan.pdf')).toHaveAttribute('src', PDF)
})

test('a file the browser cannot show has Download but no Preview', () => {
  render(<AttachmentCard name="bundle.zip" url="https://inertia.test/b.zip" type="application/zip" />)
  expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Download bundle.zip' })).toBeInTheDocument()
})

test('an audio card plays the file in the page', () => {
  const { container } = render(<AttachmentCard name="song.mp3" url="https://inertia.test/song.mp3" type="audio/mpeg" size={4096} player />)
  const audio = container.querySelector('audio')!
  expect(audio).toHaveAttribute('src', 'https://inertia.test/song.mp3')
  expect(audio).toHaveAttribute('controls')
  expect(screen.getByText('MP3 audio · 4 KB')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
})

test('a file card without the player option has no audio element', () => {
  const { container } = render(<AttachmentCard name="song.mp3" url="https://inertia.test/song.mp3" type="audio/mpeg" />)
  expect(container.querySelector('audio')).toBeNull()
})

test('Remove appears only when the document can be edited', () => {
  const remove = jest.fn()
  const { rerender } = render(<AttachmentCard name="Plan.pdf" url={PDF} type="application/pdf" onRemove={remove} />)
  fireEvent.click(screen.getByRole('button', { name: 'Remove Plan.pdf' }))
  expect(remove).toHaveBeenCalledTimes(1)

  rerender(<AttachmentCard name="Plan.pdf" url={PDF} type="application/pdf" />)
  expect(screen.queryByRole('button', { name: 'Remove Plan.pdf' })).not.toBeInTheDocument()
})

test('the Remove button can be named for what it does', () => {
  const detach = jest.fn()
  render(<AttachmentCard name="Plan.pdf" url={PDF} type="application/pdf" onRemove={detach} removeLabel="Detach" />)
  fireEvent.click(screen.getByRole('button', { name: 'Detach Plan.pdf' }))
  expect(detach).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('button', { name: 'Remove Plan.pdf' })).not.toBeInTheDocument()
})

test('a source that could run script gets no link, player or preview', () => {
  const { container } = render(<AttachmentCard name="evil.pdf" url="javascript:alert(1)" type="application/pdf" player />)
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Preview' })).not.toBeInTheDocument()
  expect(container.querySelector('audio')).toBeNull()
  expect(screen.getByText('PDF · Unavailable')).toBeInTheDocument()
})
