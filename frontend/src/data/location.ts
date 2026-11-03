import type { PlaceResult, TableData, TableField, TableRecord } from '@/api/tables'
import { parseCoordinates, type LatLng } from '@/util/geo'

// A Collection record that has a place on the map; `matched` is the name the
// place search gave an address.
export interface MapPin { id: number; label: string; position: LatLng; record: TableRecord; matched?: string }
// A record the map cannot place, with what its location field holds (empty when
// nothing) and, for an address the place search could not use, why.
export interface UnplottedRecord { id: number; label: string; value: string; problem?: string }
export interface MapPins { pins: MapPin[]; unplotted: UnplottedRecord[] }

// Fields a record's place can live in. Collections have no location type yet,
// so a place is a text field holding "latitude, longitude", or an address when
// the field looks places up (`geocode`).
export function locationFields(fields: TableField[]): TableField[] {
  return fields.filter((field) => field.data_type === 'text')
}

// Where a record is: the coordinates typed into the field, else the place the
// server found for the address typed there. Null when it has neither.
export function placeOf(record: TableRecord, field: TableField): { position: LatLng; matched?: string } | null {
  const typed = parseCoordinates(record.values[field.id])
  if (typed) return { position: typed }
  const found = record.places?.[field.id]
  if (found?.status !== 'found' || typeof found.latitude !== 'number' || typeof found.longitude !== 'number') return null
  return { position: { lat: found.latitude, lng: found.longitude }, ...(found.name ? { matched: found.name } : {}) }
}

// Why an address has no place, in words for people; null when nothing went wrong.
export function placeProblem(place: PlaceResult | undefined): string | null {
  if (place?.status === 'not_found') return 'No place found for this text.'
  if (place?.status === 'failed') return place.error || 'The place could not be looked up.'
  return null
}

const LOCATION_NAME = /location|coordinate|position|latlng|lat.?lon|geo|place/i

// The field the map opens on: the text field with the most places in it, then
// one that looks addresses up, then one named like a location, then the first.
// Null when there is no text field.
export function defaultLocationField({ fields, records }: TableData): TableField | null {
  const ranked = locationFields(fields).map((field, index) => ({
    field,
    index,
    placed: records.filter((record) => placeOf(record, field)).length,
    looksUp: Boolean(field.geocode),
    named: LOCATION_NAME.test(field.name),
  }))
  ranked.sort((a, b) => b.placed - a.placed || Number(b.looksUp) - Number(a.looksUp) || Number(b.named) - Number(a.named) || a.index - b.index)
  return ranked[0]?.field ?? null
}

const NAME_FIELD = /name|title/i

// What to call a record on the map: its first filled-in text field other than
// the location, preferring one named like a name or title.
export function recordLabel(record: TableRecord, fields: TableField[], location: TableField): string {
  const texts = locationFields(fields).filter((field) => field.id !== location.id)
  const ordered = [...texts.filter((field) => NAME_FIELD.test(field.name)), ...texts.filter((field) => !NAME_FIELD.test(field.name))]
  for (const field of ordered) {
    const value = record.values[field.id]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return `Record #${record.id}`
}

// Records split into those whose location field holds coordinates and the rest.
export function mapPins(data: TableData, location: TableField | null): MapPins {
  const result: MapPins = { pins: [], unplotted: [] }
  if (!location) return result
  for (const record of data.records) {
    const raw = record.values[location.id]
    const place = placeOf(record, location)
    const label = recordLabel(record, data.fields, location)
    if (place) result.pins.push({ id: record.id, label, position: place.position, record, ...(place.matched ? { matched: place.matched } : {}) })
    else {
      const problem = placeProblem(record.places?.[location.id])
      result.unplotted.push({ id: record.id, label, value: typeof raw === 'string' ? raw : '', ...(problem ? { problem } : {}) })
    }
  }
  return result
}

// A record's other filled-in values as name and text, for the pin's details.
export function pinDetails(record: TableRecord, fields: TableField[], location: TableField): { name: string; value: string }[] {
  return fields.flatMap((field) => {
    const raw = record.values[field.id]
    if (field.id === location.id || raw == null || raw === '') return []
    const value = typeof raw === 'boolean' ? (raw ? 'Yes' : 'No') : field.data_type === 'relation' ? `Record #${raw}` : String(raw)
    return [{ name: field.name, value }]
  })
}
