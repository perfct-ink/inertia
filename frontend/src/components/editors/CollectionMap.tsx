import { useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { ExternalLink, Maximize, MapPin as MapPinIcon, Minus, Plus, X } from 'lucide-react'
import { Button, Select, classNames } from '@/components/ui'
import type { TableData } from '@/api/tables'
import { defaultLocationField, locationFields, mapPins, pinDetails } from '@/data/location'
import { useElementSize } from '@/hooks/useElementSize'
import {
  MAX_ZOOM, MIN_ZOOM, fitView, formatCoordinates, formatDegrees, graticule, openStreetMapUrl, panView, tileUrl, toScreen,
  visibleTiles, zoomView, type MapView,
} from '@/util/geo'
import './CollectionMap.scss'

// Used until the map is measured, and where nothing can be (tests).
const FALLBACK_SIZE = { width: 640, height: 420 }
const PAN_STEP = 64
// Pins this far outside the map are still drawn so none pops in at the edge.
const EDGE = 48
// How many records that cannot be placed are named before "and N more".
const UNPLACED_SHOWN = 10
const PAN_KEYS: Record<string, [number, number]> = {
  ArrowLeft: [-PAN_STEP, 0], ArrowRight: [PAN_STEP, 0], ArrowUp: [0, -PAN_STEP], ArrowDown: [0, PAN_STEP],
}

interface CollectionMapProps {
  data: TableData
  // Space members by user id, so a person field's details name the person.
  people?: ReadonlyMap<number, string>
  // A tile server template like https://tiles.example/{z}/{x}/{y}.png. Without
  // one the map is a plain latitude/longitude grid and makes no outside requests.
  tileTemplate?: string
  attribution?: string
}

function Empty({ title, children }: { title: string; children: ReactNode }) {
  return <div className="collection_map-empty">
    <MapPinIcon className="collection_map-empty_icon" aria-hidden="true" />
    <p className="collection_map-empty_title">{title}</p>
    <p className="collection_map-empty_text">{children}</p>
  </div>
}

// The map view of a Collection: each record whose location field holds
// "latitude, longitude" is a pin. Drag to move, buttons or +/- to zoom.
export default function CollectionMap({ data, people, tileTemplate = process.env.MAP_TILE_URL, attribution = process.env.MAP_TILE_ATTRIBUTION }: CollectionMapProps) {
  const helpId = useId()
  const fields = locationFields(data.fields)
  const fallbackField = useMemo(() => defaultLocationField(data), [data])
  const [chosenId, setChosenId] = useState<number | null>(null)
  const location = fields.find((field) => field.id === chosenId) ?? fallbackField
  const { pins, unplotted } = useMemo(() => mapPins(data, location), [data, location])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = pins.find((pin) => pin.id === selectedId) ?? null

  const [canvasRef, size] = useElementSize<HTMLDivElement>(FALLBACK_SIZE)
  const fitted = useMemo(() => fitView(pins.map((pin) => pin.position), size), [pins, size])
  // Null until the person moves the map; then it no longer follows the pins.
  const [moved, setMoved] = useState<MapView | null>(null)
  const view = moved ?? fitted
  const drag = useRef<{ pointer: number; x: number; y: number } | null>(null)
  const move = (change: (current: MapView) => MapView) => setMoved((current) => change(current ?? fitted))

  const tiles = useMemo(() => (tileTemplate ? visibleTiles(view, size) : []).flatMap((tile) => {
    const src = tileUrl(tileTemplate, tile)
    return src ? [{ ...tile, src }] : []
  }), [tileTemplate, view, size])
  const lines = useMemo(() => (tiles.length ? [] : graticule(view, size)), [tiles, view, size])
  const placed = useMemo(() => pins
    .map((pin) => ({ pin, ...toScreen(pin.position, view, size) }))
    .filter(({ x, y }) => x > -EDGE && x < size.width + EDGE && y > -EDGE && y < size.height + EDGE), [pins, view, size])

  function chooseField(id: number) {
    setChosenId(id)
    setSelectedId(null)
    setMoved(null)
  }
  function showPin(id: number) {
    const pin = pins.find((candidate) => candidate.id === id)
    setSelectedId(id)
    if (pin) move((current) => ({ ...current, center: pin.position }))
  }
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-map-control]')) return
    drag.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }
  function dragMap(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || start.pointer !== event.pointerId) return
    const [dx, dy] = [event.clientX - start.x, event.clientY - start.y]
    drag.current = { ...start, x: event.clientX, y: event.clientY }
    move((current) => panView(current, -dx, -dy))
  }
  function pressKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    const pan = PAN_KEYS[event.key]
    if (pan) move((current) => panView(current, ...pan))
    else if (event.key === '+' || event.key === '=') move((current) => zoomView(current, 1))
    else if (event.key === '-') move((current) => zoomView(current, -1))
    else if (event.key === 'Escape' && selected) setSelectedId(null)
    else return
    event.preventDefault()
  }

  if (!location) {
    return <div className="view-collection_map">
      <div className="collection_map-main">
        <Empty title="Add a text field for each record’s location">Switch to the Grid view, add a text field, and type latitude and longitude into it, like 48.8584, 2.2945.</Empty>
      </div>
    </div>
  }

  return <div className="view-collection_map">
    <div className="collection_map-main">
      {pins.length === 0 ? <Empty title="No record has coordinates yet">
        Type latitude and longitude into “{location.name}” in the Grid view, like 48.8584, 2.2945, and the record appears here.
      </Empty> : <>
        <div ref={canvasRef} className="collection_map-canvas" tabIndex={0} role="group" aria-label={`Map of ${location.name}`} aria-describedby={helpId}
          onPointerDown={startDrag} onPointerMove={dragMap} onPointerUp={() => { drag.current = null }} onPointerCancel={() => { drag.current = null }} onKeyDown={pressKey}>
          {tiles.map((tile) => <img key={tile.key} className="collection_map-tile" src={tile.src} alt="" draggable={false} referrerPolicy="no-referrer" style={{ left: tile.left, top: tile.top }} />)}
          {lines.length > 0 && <svg className="collection_map-grid" width={size.width} height={size.height} aria-hidden="true">
            {lines.map((line) => <g key={`${line.axis}${line.value}`}>
              <line className={classNames('collection_map-grid_line', line.value === 0 && 'collection_map-grid_line--origin')}
                x1={line.axis === 'lng' ? line.at : 0} x2={line.axis === 'lng' ? line.at : size.width}
                y1={line.axis === 'lat' ? line.at : 0} y2={line.axis === 'lat' ? line.at : size.height} />
              <text className="collection_map-grid_label" x={line.axis === 'lng' ? line.at + 4 : 4} y={line.axis === 'lat' ? line.at - 4 : 14}>{formatDegrees(line.axis, line.value)}</text>
            </g>)}
          </svg>}
          {placed.map(({ pin, x, y }) => <Button key={pin.id} data-map-control aria-label={pin.label} aria-pressed={pin.id === selected?.id}
            className={classNames('collection_map-pin', pin.id === selected?.id && 'collection_map-pin--selected')} style={{ left: x, top: y }} onClick={() => setSelectedId(pin.id)}>
            <MapPinIcon className="collection_map-pin_icon" aria-hidden="true" />
          </Button>)}
          {selected && <div className="collection_map-callout" data-map-control role="region" aria-label={`Details for ${selected.label}`}>
            <div className="collection_map-callout_head">
              <p className="collection_map-callout_title">{selected.label}</p>
              <Button aria-label="Close details" title="Close details" onClick={() => setSelectedId(null)} className="collection_map-callout_close"><X className="collection_map-callout_close_icon" /></Button>
            </div>
            <p className="collection_map-callout_place">{formatCoordinates(selected.position)}</p>
            <dl className="collection_map-fields">
              {pinDetails(selected.record, data.fields, location, { people }).map((detail) => <div key={detail.name} className="collection_map-fields_row">
                <dt className="collection_map-fields_name">{detail.name}</dt>
                <dd className="collection_map-fields_value">{detail.value}</dd>
              </div>)}
            </dl>
            <a className="collection_map-link" href={openStreetMapUrl(selected.position)} target="_blank" rel="noopener noreferrer">
              Open in OpenStreetMap<ExternalLink className="collection_map-link_icon" aria-hidden="true" />
            </a>
          </div>}
          <div className="collection_map-controls" data-map-control>
            <Button variant="secondary" aria-label="Zoom in" title="Zoom in" disabled={view.zoom >= MAX_ZOOM} onClick={() => move((current) => zoomView(current, 1))} className="collection_map-control"><Plus className="collection_map-control_icon" /></Button>
            <Button variant="secondary" aria-label="Zoom out" title="Zoom out" disabled={view.zoom <= MIN_ZOOM} onClick={() => move((current) => zoomView(current, -1))} className="collection_map-control"><Minus className="collection_map-control_icon" /></Button>
            <Button variant="secondary" aria-label="Show every pin" title="Show every pin" disabled={moved === null} onClick={() => setMoved(null)} className="collection_map-control"><Maximize className="collection_map-control_icon" /></Button>
          </div>
          {tiles.length > 0 && attribution && <p className="collection_map-attribution">{attribution}</p>}
        </div>
        <p id={helpId} className="collection_map-help">Drag the map to move it. With the keyboard, arrow keys move it and + and − zoom.</p>
      </>}
    </div>

    <aside className="collection_map-side" aria-label="Map records">
      {fields.length > 1 && <label className="collection_map-field">Location field
        <Select className="collection_map-select" value={location.id} onChange={(event) => chooseField(Number(event.target.value))}>
          {fields.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
        </Select>
      </label>}
      <p className="collection_map-count">{pins.length} of {data.records.length} records on the map</p>
      {pins.length > 0 && <ul className="collection_map-list">
        {pins.map((pin) => <li key={pin.id} className="collection_map-item">
          <Button aria-pressed={pin.id === selected?.id} onClick={() => showPin(pin.id)}
            className={classNames('collection_map-item_button', pin.id === selected?.id && 'collection_map-item_button--selected')}>
            <span className="collection_map-item_label">{pin.label}</span>
            <span className="collection_map-item_place">{formatCoordinates(pin.position)}</span>
          </Button>
        </li>)}
      </ul>}
      {unplotted.length > 0 && <section className="collection_map-unplaced" aria-label="Records not on the map">
        <h2 className="collection_map-unplaced_title">Not on the map ({unplotted.length})</h2>
        <p className="collection_map-unplaced_text">“{location.name}” is empty or is not latitude and longitude, like 48.8584, 2.2945. Fix them in the Grid view.</p>
        <ul className="collection_map-unplaced_list">
          {unplotted.slice(0, UNPLACED_SHOWN).map((record) => <li key={record.id} className="collection_map-unplaced_item">
            {record.label}{record.value && <span className="collection_map-unplaced_value"> · “{record.value}”</span>}
          </li>)}
        </ul>
        {unplotted.length > UNPLACED_SHOWN && <p className="collection_map-unplaced_text">and {unplotted.length - UNPLACED_SHOWN} more</p>}
      </section>}
    </aside>
  </div>
}
