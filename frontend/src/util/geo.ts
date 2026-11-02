// Coordinates and Web Mercator ("slippy map") math for the Collection map view.
// Pure functions, so the map can be tested without a browser or a map library.

export interface LatLng { lat: number; lng: number }
export interface MapSize { width: number; height: number }
export interface MapView { center: LatLng; zoom: number }
export interface Point { x: number; y: number }
// One map tile, placed in pixels relative to the top-left of the map.
export interface MapTile { key: string; x: number; y: number; z: number; left: number; top: number }
// A latitude or longitude line, `at` pixels from the top (lat) or left (lng).
export interface GridLine { axis: 'lat' | 'lng'; value: number; at: number }

export const TILE_SIZE = 256
export const MIN_ZOOM = 1
export const MAX_ZOOM = 18
// Web Mercator cannot show the poles; this is where the square world ends.
export const MAX_LATITUDE = 85.0511287798
// Pixels the pins keep from the edge when the map fits them all, and the
// closest the map zooms when it fits a single place (about a city).
const FIT_PADDING = 48
const FIT_MAX_ZOOM = 12
// The smallest gap between two graticule lines.
const GRID_SPACING = 80
const GRID_STEPS = [60, 30, 15, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.01]

const NUMBER = '[+-]?\\d+(?:\\.\\d+)?'
const COORDINATES = new RegExp(`^(?:geo:)?[(\\[]?\\s*(${NUMBER})\\s*(?:,|;|\\s)\\s*(${NUMBER})\\s*[)\\]]?$`, 'i')

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

// "48.8584, 2.2945" (also "48.8584 2.2945", "48.8584;2.2945", "(48.8584, 2.2945)"
// and "geo:48.8584,2.2945") as latitude then longitude. Anything else, or a pair
// outside the globe, is not a place we can plot.
export function parseCoordinates(value: unknown): LatLng | null {
  if (typeof value !== 'string') return null
  const match = COORDINATES.exec(value.trim())
  if (!match) return null
  const lat = Number(match[1])
  const lng = Number(match[2])
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? { lat, lng } : null
}

// "48.8584, 2.2945": five decimals (about a metre), without trailing zeros.
export function formatCoordinates({ lat, lng }: LatLng): string {
  return `${+lat.toFixed(5)}, ${+lng.toFixed(5)}`
}

// "48.8584° N" or "2.2945° W", for graticule labels.
export function formatDegrees(axis: GridLine['axis'], value: number): string {
  const hemisphere = axis === 'lat' ? (value < 0 ? 'S' : 'N') : (value < 0 ? 'W' : 'E')
  return `${Math.abs(value)}°${value === 0 || Math.abs(value) === 180 ? '' : ` ${hemisphere}`}`
}

const worldSize = (zoom: number) => TILE_SIZE * 2 ** zoom

// A place as pixels from the top-left of the whole world at this zoom.
export function project({ lat, lng }: LatLng, zoom: number): Point {
  const sin = Math.sin((clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180)
  const size = worldSize(zoom)
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size }
}

// The inverse of project.
export function unproject({ x, y }: Point, zoom: number): LatLng {
  const size = worldSize(zoom)
  const n = Math.PI - (2 * Math.PI * y) / size
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (x / size) * 360 - 180 }
}

// Where a place lands on screen, in pixels from the top-left of the map.
export function toScreen(position: LatLng, view: MapView, size: MapSize): Point {
  const point = project(position, view.zoom)
  const center = project(view.center, view.zoom)
  return { x: point.x - center.x + size.width / 2, y: point.y - center.y + size.height / 2 }
}

// The view that shows every place: the closest zoom at which all of them fit
// inside the map with some padding, centred on their bounding box. No places
// shows the whole world.
export function fitView(points: LatLng[], size: MapSize): MapView {
  if (points.length === 0) return { center: { lat: 20, lng: 0 }, zoom: MIN_ZOOM }
  const bounds = points.reduce(
    (b, { lat, lng }) => ({ south: Math.min(b.south, lat), north: Math.max(b.north, lat), west: Math.min(b.west, lng), east: Math.max(b.east, lng) }),
    { south: Infinity, north: -Infinity, west: Infinity, east: -Infinity },
  )
  const roomWidth = Math.max(1, size.width - 2 * FIT_PADDING)
  const roomHeight = Math.max(1, size.height - 2 * FIT_PADDING)
  const corners = (z: number) => [project({ lat: bounds.north, lng: bounds.west }, z), project({ lat: bounds.south, lng: bounds.east }, z)]
  let zoom = FIT_MAX_ZOOM
  while (zoom > MIN_ZOOM) {
    const [topLeft, bottomRight] = corners(zoom)
    if (bottomRight.x - topLeft.x <= roomWidth && bottomRight.y - topLeft.y <= roomHeight) break
    zoom--
  }
  const [topLeft, bottomRight] = corners(zoom)
  return { center: unproject({ x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 }, zoom), zoom }
}

// The view moved by a number of screen pixels (dragging the map right means
// panning left, so callers pass the negated drag). It stops at the world's edge.
export function panView(view: MapView, dx: number, dy: number): MapView {
  const center = project(view.center, view.zoom)
  const limit = worldSize(view.zoom)
  return { ...view, center: unproject({ x: clamp(center.x + dx, 0, limit), y: clamp(center.y + dy, 0, limit) }, view.zoom) }
}

// The view zoomed in (positive) or out (negative) around its centre.
export function zoomView(view: MapView, delta: number): MapView {
  return { ...view, zoom: clamp(view.zoom + delta, MIN_ZOOM, MAX_ZOOM) }
}

// The map tiles that cover the map. Tiles repeat east and west of the world;
// there are none above or below it.
export function visibleTiles(view: MapView, size: MapSize): MapTile[] {
  const { zoom: z } = view
  const count = 2 ** z
  const center = project(view.center, z)
  const originX = center.x - size.width / 2
  const originY = center.y - size.height / 2
  const tiles: MapTile[] = []
  const lastY = Math.min(Math.floor((originY + size.height) / TILE_SIZE), count - 1)
  for (let ty = Math.max(Math.floor(originY / TILE_SIZE), 0); ty <= lastY; ty++) {
    for (let tx = Math.floor(originX / TILE_SIZE); tx <= Math.floor((originX + size.width) / TILE_SIZE); tx++) {
      tiles.push({ key: `${z}/${tx}/${ty}`, x: ((tx % count) + count) % count, y: ty, z, left: tx * TILE_SIZE - originX, top: ty * TILE_SIZE - originY })
    }
  }
  return tiles
}

// A tile's address from a template like https://tiles.example/{z}/{x}/{y}.png.
// Templates that are not https or lack {z}, {x} and {y} are ignored, so a typo
// in the configuration shows no tiles rather than requests to the wrong place.
export function tileUrl(template: string | undefined, tile: Pick<MapTile, 'x' | 'y' | 'z'>): string | null {
  if (!template || !/^https:\/\/\S+$/.test(template) || !['{z}', '{x}', '{y}'].every((token) => template.includes(token))) return null
  return template.replace('{z}', String(tile.z)).replace('{x}', String(tile.x)).replace('{y}', String(tile.y))
}

// A page on openstreetmap.org centred on a place, for a person to open from a link.
export function openStreetMapUrl({ lat, lng }: LatLng): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`
}

// Latitude and longitude lines across the map, spaced at least GRID_SPACING
// pixels apart, for the map's background when there are no tiles.
export function graticule(view: MapView, size: MapSize): GridLine[] {
  const pixelsPerDegree = worldSize(view.zoom) / 360
  const step = [...GRID_STEPS].reverse().find((candidate) => candidate * pixelsPerDegree >= GRID_SPACING) ?? GRID_STEPS[0]
  const center = project(view.center, view.zoom)
  const topLeft = unproject({ x: center.x - size.width / 2, y: center.y - size.height / 2 }, view.zoom)
  const bottomRight = unproject({ x: center.x + size.width / 2, y: center.y + size.height / 2 }, view.zoom)
  const lines: GridLine[] = []
  const multiples = (from: number, to: number) => {
    const first = Math.ceil(from / step)
    return Array.from({ length: Math.max(0, Math.floor(to / step) - first + 1) }, (_, i) => Number(((first + i) * step).toFixed(6)))
  }
  for (const lng of multiples(Math.max(topLeft.lng, -180), Math.min(bottomRight.lng, 180))) {
    lines.push({ axis: 'lng', value: lng, at: toScreen({ lat: view.center.lat, lng }, view, size).x })
  }
  for (const lat of multiples(Math.max(bottomRight.lat, -MAX_LATITUDE), Math.min(topLeft.lat, MAX_LATITUDE))) {
    lines.push({ axis: 'lat', value: lat, at: toScreen({ lat, lng: view.center.lng }, view, size).y })
  }
  return lines
}
