import '@testing-library/jest-dom'
import { fireEvent, render, screen } from '@testing-library/react'
import ExportMenu from './ExportMenu'

test('offers CSV and Excel and reports the one chosen', () => {
  const onExport = jest.fn()
  render(<ExportMenu onExport={onExport} />)
  fireEvent.click(screen.getByRole('button', { name: 'Export' }))
  expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual(['CSV (.csv)', 'Excel (.xlsx)'])
  fireEvent.click(screen.getByRole('menuitem', { name: 'Excel (.xlsx)' }))
  expect(onExport).toHaveBeenCalledWith('xlsx')
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
})

test('is a switched-off button when there is nothing to export', () => {
  const onExport = jest.fn()
  render(<ExportMenu onExport={onExport} disabled />)
  const button = screen.getByRole('button', { name: 'Export' })
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  expect(onExport).not.toHaveBeenCalled()
})
