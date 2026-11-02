import {
  MAX_ZOOM, MIN_ZOOM, TILE_SIZE, fitView, formatCoordinates, formatDegrees, graticule, openStreetMapUrl, panView, parseCoordinates,
  project, tileUrl, toScreen, unproject, visibleTiles, zoomView,
} from './geo'

const size = { width: 600, height: 400 }
const paris = { lat: 48.8584, lng: 2.2945 }
const tokyo = { lat: 35.6762, lng: 139.6503 }

describe('parseCoordinates', () => {
  test('reads a latitude and longitude pair in common shapes', () => {
    expect(parseCoordinates('48.8584, 2.2945')).toEqual(paris)
    expect(parseCoordinates(' 48.8584 2.2945 ')).toEqual(paris)
    expect(parseCoordinates('48.8584;2.2945')).toEqual(paris)
    expect(parseCoordinates('(48.8584, 2.2945)')).toEqual(paris)
    expect(parseCoordinates('geo:48.8584,2.2945')).toEqual(paris)
    expect(parseCoordinates('-33.8688, 151.2093')).toEqual({ lat: -33.8688, lng: 151.2093 })
    expect(parseCoordinates('0, 0')).toEqual({ lat: 0, lng: 0 })
  })

  test('rejects text, single numbers and pairs off the globe', () => {
    expect(parseCoordinates('Eiffel Tower, Paris')).toBeNull()
    expect(parseCoordinates('48.8584')).toBeNull()
    expect(parseCoordinates('48.8584, 2.2945, 10')).toBeNull()
    expect(parseCoordinates('91, 0')).toBeNull()
    expect(parseCoordinates('0, 181')).toBeNull()
    expect(parseCoordinates('')).toBeNull()
    expect(parseCoordinates(null)).toBeNull()
    expect(parseCoordinates(12.5)).toBeNull()
  })
})

describe('formatting', () => {
  test('coordinates keep five decimals without trailing zeros', () => {
    expect(formatCoordinates({ lat: 48.858400001, lng: 2.29450123456 })).toBe('48.8584, 2.2945')
    expect(formatCoordinates({ lat: 48.8584, lng: 2.29456789 })).toBe('48.8584, 2.29457')
    expect(formatCoordinates({ lat: -10, lng: 20.5 })).toBe('-10, 20.5')
  })

  test('degrees name the hemisphere except on the equator and the date line', () => {
    expect(formatDegrees('lat', 30)).toBe('30° N')
    expect(formatDegrees('lat', -30)).toBe('30° S')
    expect(formatDegrees('lng', -60)).toBe('60° W')
    expect(formatDegrees('lng', 15)).toBe('15° E')
    expect(formatDegrees('lat', 0)).toBe('0°')
    expect(formatDegrees('lng', 180)).toBe('180°')
  })
})

describe('project', () => {
  test('puts the equator and the prime meridian at the middle of the world', () => {
    expect(project({ lat: 0, lng: 0 }, 0)).toEqual({ x: TILE_SIZE / 2, y: TILE_SIZE / 2 })
    expect(project({ lat: 0, lng: -180 }, 1).x).toBe(0)
    expect(project({ lat: 0, lng: 180 }, 1).x).toBe(2 * TILE_SIZE)
  })

  test('unproject undoes project', () => {
    const back = unproject(project(tokyo, 9), 9)
    expect(back.lat).toBeCloseTo(tokyo.lat, 6)
    expect(back.lng).toBeCloseTo(tokyo.lng, 6)
  })

  test('the poles are clamped to the edge of the square world', () => {
    expect(project({ lat: 90, lng: 0 }, 2).y).toBeCloseTo(0, 3)
    expect(project({ lat: -90, lng: 0 }, 2).y).toBeCloseTo(4 * TILE_SIZE, 3)
  })

  test('toScreen puts the centre in the middle of the map', () => {
    const view = { center: paris, zoom: 8 }
    const centre = toScreen(paris, view, size)
    expect(centre.x).toBeCloseTo(300, 6)
    expect(centre.y).toBeCloseTo(200, 6)
    expect(toScreen({ lat: paris.lat, lng: paris.lng + 1 }, view, size).x).toBeGreaterThan(300)
    expect(toScreen({ lat: paris.lat + 1, lng: paris.lng }, view, size).y).toBeLessThan(200)
  })
})

describe('fitView', () => {
  test('shows the whole world when there is nothing to plot', () => {
    expect(fitView([], size).zoom).toBe(MIN_ZOOM)
  })

  test('a single place is centred and zoomed to about a city', () => {
    const view = fitView([paris], size)
    expect(view.zoom).toBe(12)
    expect(view.center.lat).toBeCloseTo(paris.lat, 6)
    expect(view.center.lng).toBeCloseTo(paris.lng, 6)
  })

  test('every place fits inside the map with padding', () => {
    const view = fitView([paris, tokyo], size)
    for (const place of [paris, tokyo]) {
      const { x, y } = toScreen(place, view, size)
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(size.width)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(size.height)
    }
    expect(view.zoom).toBeLessThan(5)
  })

  test('nearby places zoom in further than distant ones', () => {
    const near = fitView([paris, { lat: 48.87, lng: 2.35 }], size)
    expect(near.zoom).toBeGreaterThan(fitView([paris, tokyo], size).zoom)
  })

  test('a smaller map zooms out to keep the places in view', () => {
    const phone = fitView([paris, { lat: 51.5, lng: -0.12 }], { width: 343, height: 360 })
    expect(phone.zoom).toBeLessThanOrEqual(fitView([paris, { lat: 51.5, lng: -0.12 }], size).zoom)
  })
})

describe('panView and zoomView', () => {
  test('panning right moves the centre east and down moves it south', () => {
    const view = { center: paris, zoom: 6 }
    expect(panView(view, 100, 0).center.lng).toBeGreaterThan(paris.lng)
    expect(panView(view, 0, 100).center.lat).toBeLessThan(paris.lat)
    expect(panView(view, 0, 0).center.lat).toBeCloseTo(paris.lat, 6)
  })

  test('panning stops at the edge of the world', () => {
    const view = panView({ center: paris, zoom: 3 }, 1e9, -1e9)
    expect(view.center.lng).toBeCloseTo(180, 6)
    expect(view.center.lat).toBeCloseTo(85.0511, 3)
  })

  test('zoom stays between the limits and keeps the centre', () => {
    const view = { center: paris, zoom: 5 }
    expect(zoomView(view, 1)).toEqual({ center: paris, zoom: 6 })
    expect(zoomView({ ...view, zoom: MAX_ZOOM }, 1).zoom).toBe(MAX_ZOOM)
    expect(zoomView({ ...view, zoom: MIN_ZOOM }, -1).zoom).toBe(MIN_ZOOM)
  })
})

describe('visibleTiles', () => {
  test('covers the map and places tiles in pixels', () => {
    // The world is 4 tiles wide at zoom 2, so the map centre is the corner of tiles (1,1) to (2,2).
    const tiles = visibleTiles({ center: { lat: 0, lng: 0 }, zoom: 2 }, { width: 512, height: 512 })
    expect(tiles.map((t) => `${t.x}/${t.y}`).sort()).toEqual(['1/1', '1/2', '1/3', '2/1', '2/2', '2/3', '3/1', '3/2', '3/3'])
    const first = tiles.find((t) => t.x === 1 && t.y === 1)!
    expect([first.left, first.top]).toEqual([0, 0])
    const second = tiles.find((t) => t.x === 2 && t.y === 2)!
    expect([second.left, second.top]).toEqual([256, 256])
  })

  test('has no tiles above or below the world', () => {
    const tiles = visibleTiles({ center: { lat: 80, lng: 0 }, zoom: 2 }, { width: 800, height: 800 })
    expect(tiles.length).toBeGreaterThan(0)
    expect(tiles.every((t) => t.y >= 0 && t.y < 4)).toBe(true)
  })

  test('repeats the world east and west of the date line', () => {
    const tiles = visibleTiles({ center: { lat: 0, lng: -179 }, zoom: 2 }, { width: 800, height: 400 })
    const west = tiles.find((t) => t.key.startsWith('2/-1/'))!
    expect(west.x).toBe(3)
    expect(west.left).toBeGreaterThan(0)
  })

  test('every tile has a unique key', () => {
    const tiles = visibleTiles({ center: paris, zoom: 10 }, size)
    expect(new Set(tiles.map((t) => t.key)).size).toBe(tiles.length)
  })
})

describe('tileUrl', () => {
  const template = 'https://tiles.example.com/{z}/{x}/{y}.png'

  test('fills in the tile address', () => {
    expect(tileUrl(template, { x: 5, y: 7, z: 4 })).toBe('https://tiles.example.com/4/5/7.png')
  })

  test('ignores a missing, insecure or incomplete template', () => {
    expect(tileUrl(undefined, { x: 1, y: 1, z: 1 })).toBeNull()
    expect(tileUrl('', { x: 1, y: 1, z: 1 })).toBeNull()
    expect(tileUrl('http://tiles.example.com/{z}/{x}/{y}.png', { x: 1, y: 1, z: 1 })).toBeNull()
    expect(tileUrl('https://tiles.example.com/{z}/{x}.png', { x: 1, y: 1, z: 1 })).toBeNull()
  })
})

describe('openStreetMapUrl', () => {
  test('marks the place and centres the page on it', () => {
    expect(openStreetMapUrl(paris)).toBe('https://www.openstreetmap.org/?mlat=48.8584&mlon=2.2945#map=15/48.8584/2.2945')
  })
})

describe('graticule', () => {
  test('draws lines that stay at least 80px apart', () => {
    const lines = graticule({ center: { lat: 0, lng: 0 }, zoom: 3 }, size)
    const lng = lines.filter((l) => l.axis === 'lng').map((l) => l.at).sort((a, b) => a - b)
    expect(lng.length).toBeGreaterThan(1)
    for (let i = 1; i < lng.length; i++) expect(lng[i] - lng[i - 1]).toBeGreaterThanOrEqual(80)
    expect(lines.some((l) => l.axis === 'lat')).toBe(true)
  })

  test('lines sit where the view puts that latitude or longitude', () => {
    const view = { center: { lat: 0, lng: 0 }, zoom: 3 }
    const meridian = graticule(view, size).find((l) => l.axis === 'lng' && l.value === 0)!
    expect(meridian.at).toBeCloseTo(300, 6)
    const equator = graticule(view, size).find((l) => l.axis === 'lat' && l.value === 0)!
    expect(equator.at).toBeCloseTo(200, 6)
  })

  test('zooming in finer lines', () => {
    const values = (zoom: number) => graticule({ center: paris, zoom }, size).filter((l) => l.axis === 'lng').map((l) => l.value)
    const coarse = values(4)
    const fine = values(12)
    expect(Math.abs(fine[1] - fine[0])).toBeLessThan(Math.abs(coarse[1] - coarse[0]))
  })

  test('draws nothing past the date line', () => {
    const lines = graticule({ center: { lat: 0, lng: 179 }, zoom: 3 }, size)
    expect(lines.filter((l) => l.axis === 'lng').every((l) => l.value <= 180)).toBe(true)
  })
})
