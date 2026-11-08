import type { TableData, TableField, TableRecord } from '@/api/tables'
import { displayValue, type DisplayContext } from '@/data/fieldType'
import { parseCoordinates, type LatLng } from '@/util/geo'

// A Collection record that has a place on the map.
export interface MapPin { id: number; label: string; position: LatLng; record: TableRecord }
// A record the map cannot place, with what its location field holds (empty when nothing).
export interface UnplottedRecord { id: number; label: string; value: string }
export interface MapPins { pins: MapPin[]; unplotted: UnplottedRecord[] }

// Fields a record's place can live in. Collections have no location type yet,
// so a place is a text field holding "latitude, longitude".
export function locationFields(fields: TableField[]): TableField[] {
  return fields.filter((field) => field.data_type === 'text')
}

const LOCATION_NAME = /location|coordinate|position|latlng|lat.?lon|geo|place/i

// The field the map opens on: the text field with the most places in it, then
// one named like a location, then the first. Null when there is no text field.
export function defaultLocationField({ fields, records }: TableData): TableField | null {
  const ranked = locationFields(fields).map((field, index) => ({
    field,
    index,
    placed: records.filter((record) => parseCoordinates(record.values[field.id])).length,
    named: LOCATION_NAME.test(field.name),
  }))
  ranked.sort((a, b) => b.placed - a.placed || Number(b.named) - Number(a.named) || a.index - b.index)
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
    const position = parseCoordinates(raw)
    const label = recordLabel(record, data.fields, location)
    if (position) result.pins.push({ id: record.id, label, position, record })
    else result.unplotted.push({ id: record.id, label, value: typeof raw === 'string' ? raw : '' })
  }
  return result
}

// A record's other filled-in values as name and text (in each field's format), for the pin's details.
export function pinDetails(record: TableRecord, fields: TableField[], location: TableField, context: DisplayContext = {}): { name: string; value: string }[] {
  return fields.flatMap((field) => {
    const raw = record.values[field.id]
    if (field.id === location.id || raw == null || raw === '') return []
    return [{ name: field.name, value: displayValue(field, raw, context) }]
  })
}
