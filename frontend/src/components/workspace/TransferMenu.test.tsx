import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import { TransferMenu } from './TransferMenu'
import { useTransferStore } from '@/store/transfer'
import { documentTransfer } from '@/data/transfer'

let mockCanTransfer = true
jest.mock('@/hooks/useTransferTargets', () => ({
  useTransferTargets: () => ({ targets: [], canTransfer: mockCanTransfer, isLoading: false }),
}))

const item = documentTransfer({ id: 7, title: 'Plan' })

beforeEach(() => {
  mockCanTransfer = true
  useTransferStore.setState({ request: null })
})

test('offers Move to Space and Copy to Space from one button', () => {
  render(<TransferMenu item={item} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move or copy to another Space' }))
  expect(screen.getAllByRole('menuitem').map((i) => i.textContent)).toEqual(['Move to Space…', 'Copy to Space…'])
})

test('choosing an item opens the shared dialog with that mode and the item', () => {
  render(<TransferMenu item={item} />)
  fireEvent.click(screen.getByRole('button', { name: 'Move or copy to another Space' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Copy to Space…' }))
  expect(useTransferStore.getState().request).toEqual({ mode: 'copy', kind: 'document', id: 7, name: 'Plan', documentIds: [7] })

  fireEvent.click(screen.getByRole('button', { name: 'Move or copy to another Space' }))
  fireEvent.click(screen.getByRole('menuitem', { name: 'Move to Space…' }))
  expect(useTransferStore.getState().request?.mode).toBe('move')
})

test('a list row gets a ⋮ button named for the item, with the list lined up to its right edge', () => {
  render(<TransferMenu item={item} compact />)
  const button = screen.getByRole('button', { name: 'More actions for Plan' })
  expect(button).toHaveClass('transfer_menu-trigger')
  expect(screen.queryByText('Move or copy')).not.toBeInTheDocument()
  fireEvent.click(button)
  expect(screen.getByRole('menu', { name: 'More actions for Plan' })).toHaveClass('ui-menu-list--end')
})

test('shows the words "Move or copy" beside the icon when it is not compact', () => {
  render(<TransferMenu item={item} />)
  expect(screen.getByText('Move or copy')).toBeInTheDocument()
})

test('renders nothing when there is no other Space to write in', () => {
  mockCanTransfer = false
  const { container } = render(<TransferMenu item={item} />)
  expect(container).toBeEmptyDOMElement()
})
