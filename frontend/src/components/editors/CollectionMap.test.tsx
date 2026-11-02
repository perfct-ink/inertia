import { fireEvent, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom'
import CollectionMap from './CollectionMap'
import type { TableData } from '@/api/tables'

const data: TableData = {
  fields: [
    { id: 1, name: 'Name', data_type: 'text', relation_table_id: null },
    { id: 2, name: 'Location', data_type: 'text', relation_table_id: null },
    { id: 3, name: 'Seats', data_type: 'integer', relation_table_id: null },
  ],
  records: [
    { id: 10, values: { 1: 'Cafe Paris', 2: '48.8584, 2.2945', 3: 12 } },
    { id: 11, values: { 1: 'Tokyo Bar', 2: '35.6762, 139.6503' } },
    { id: 12, values: { 1: 'Nowhere', 2: 'Somewhere nice' } },
  ],
}

const map = () => screen.getByRole('group', { name: 'Map of Location' })
const pin = (name: string) => within(map()).getByRole('button', { name })

test('draws a pin for each record whose location holds coordinates', () => {
  render(<CollectionMap data={data} />)
  expect(pin('Cafe Paris')).toBeInTheDocument()
  expect(pin('Tokyo Bar')).toBeInTheDocument()
  expect(within(map()).queryByRole('button', { name: 'Nowhere' })).not.toBeInTheDocument()
  expect(screen.getByText('2 of 3 records on the map')).toBeInTheDocument()
})

test('lists the records it cannot place with what their location says', () => {
  render(<CollectionMap data={data} />)
  const unplaced = screen.getByRole('region', { name: 'Records not on the map' })
  expect(within(unplaced).getByText('Not on the map (1)')).toBeInTheDocument()
  expect(within(unplaced).getByText(/Nowhere/)).toBeInTheDocument()
  expect(within(unplaced).getByText(/Somewhere nice/)).toBeInTheDocument()
})

test('selecting a pin shows its details and a link out to OpenStreetMap, which can be closed', () => {
  render(<CollectionMap data={data} />)
  expect(screen.queryByRole('region', { name: 'Details for Cafe Paris' })).not.toBeInTheDocument()
  fireEvent.click(pin('Cafe Paris'))
  const details = screen.getByRole('region', { name: 'Details for Cafe Paris' })
  expect(pin('Cafe Paris')).toHaveAttribute('aria-pressed', 'true')
  expect(within(details).getByText('48.8584, 2.2945')).toBeInTheDocument()
  expect(within(details).getByText('Seats')).toBeInTheDocument()
  expect(within(details).getByText('12')).toBeInTheDocument()
  expect(within(details).getByRole('link', { name: /Open in OpenStreetMap/ })).toHaveAttribute('href', expect.stringContaining('mlat=48.8584&mlon=2.2945'))
  fireEvent.click(within(details).getByRole('button', { name: 'Close details' }))
  expect(screen.queryByRole('region', { name: 'Details for Cafe Paris' })).not.toBeInTheDocument()
})

test('choosing a record in the list selects its pin and recentres the map on it', () => {
  render(<CollectionMap data={data} />)
  const fit = screen.getByRole('button', { name: 'Show every pin' })
  expect(fit).toBeDisabled()
  const listed = screen.getAllByRole('button', { name: /Tokyo Bar/ }).find((button) => !map().contains(button))!
  fireEvent.click(listed)
  expect(screen.getByRole('region', { name: 'Details for Tokyo Bar' })).toBeInTheDocument()
  expect(fit).toBeEnabled()
  expect(pin('Tokyo Bar').style.left).toBe('320px')
  fireEvent.click(fit)
  expect(fit).toBeDisabled()
})

test('zoom buttons and the keyboard move the pins, and one button shows them all again', () => {
  render(<CollectionMap data={data} />)
  const before = pin('Cafe Paris').style.left
  fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
  const zoomedOut = pin('Cafe Paris').style.left
  expect(zoomedOut).not.toBe(before)
  fireEvent.keyDown(map(), { key: 'ArrowLeft' })
  expect(parseFloat(pin('Cafe Paris').style.left)).toBeCloseTo(parseFloat(zoomedOut) + 64, 3)
  fireEvent.click(screen.getByRole('button', { name: 'Show every pin' }))
  expect(pin('Cafe Paris').style.left).toBe(before)
})

test('keyboard presses on a pin do not move the map', () => {
  render(<CollectionMap data={data} />)
  const before = pin('Cafe Paris').style.left
  fireEvent.keyDown(pin('Cafe Paris'), { key: 'ArrowLeft', bubbles: true })
  expect(pin('Cafe Paris').style.left).toBe(before)
})

test('Escape closes the details', () => {
  render(<CollectionMap data={data} />)
  fireEvent.click(pin('Tokyo Bar'))
  fireEvent.keyDown(map(), { key: 'Escape' })
  expect(screen.queryByRole('region', { name: 'Details for Tokyo Bar' })).not.toBeInTheDocument()
})

test('offers a choice of location field only when there is more than one text field', () => {
  const { rerender } = render(<CollectionMap data={data} />)
  const select = screen.getByLabelText('Location field')
  expect(select).toHaveValue('2')
  fireEvent.change(select, { target: { value: '1' } })
  expect(screen.getByText('0 of 3 records on the map')).toBeInTheDocument()
  expect(screen.getByText('No record has coordinates yet')).toBeInTheDocument()
  rerender(<CollectionMap data={{ ...data, fields: data.fields.filter((field) => field.id !== 1) }} />)
  expect(screen.queryByLabelText('Location field')).not.toBeInTheDocument()
})

test('explains how to start when the collection has no text field', () => {
  render(<CollectionMap data={{ fields: [data.fields[2]], records: [] }} />)
  expect(screen.getByText('Add a text field for each record’s location')).toBeInTheDocument()
  expect(screen.queryByRole('group', { name: /Map of/ })).not.toBeInTheDocument()
})

describe('base map', () => {
  test('without a tile server it draws a grid and requests nothing from any map server', () => {
    const { container } = render(<CollectionMap data={data} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('svg.collection_map-grid')).toBeInTheDocument()
  })

  test('with a tile server it shows tiles under the pins and the provider’s attribution', () => {
    const { container } = render(<CollectionMap data={data} tileTemplate="https://tiles.example.com/{z}/{x}/{y}.png" attribution="© Example Maps" />)
    const tiles = container.querySelectorAll('img')
    expect(tiles.length).toBeGreaterThan(0)
    tiles.forEach((tile) => {
      expect(tile.getAttribute('src')).toMatch(/^https:\/\/tiles\.example\.com\/\d+\/\d+\/\d+\.png$/)
      expect(tile).toHaveAttribute('referrerpolicy', 'no-referrer')
    })
    expect(screen.getByText('© Example Maps')).toBeInTheDocument()
    expect(container.querySelector('svg.collection_map-grid')).not.toBeInTheDocument()
  })

  test('ignores a tile template that is not https', () => {
    const { container } = render(<CollectionMap data={data} tileTemplate="http://tiles.example.com/{z}/{x}/{y}.png" />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
