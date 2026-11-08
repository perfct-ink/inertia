// Geometry for the report charts, drawn as plain SVG. Pure functions, so the
// scales, ticks and paths can be tested without a browser.

export interface Point {
  x: number
  y: number
}

const roundTo = (n: number, places: number) => {
  const factor = 10 ** places
  return Math.round(n * factor) / factor
}

// A tick step of 1, 2 or 5 times a power of ten that gives about `count` ticks
// up to `max`. Never below 1: the reports count whole points and tasks.
export function niceStep(max: number, count = 4): number {
  if (!(max > 0)) return 1
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const fraction = raw / magnitude
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10
  return Math.max(1, nice * magnitude)
}

// 0 and the ticks up past `max`, e.g. 13 gives [0, 5, 10, 15]. The last one is the top of the axis.
export function axisTicks(max: number, count = 4): number[] {
  const step = niceStep(max, count)
  const steps = Math.max(1, Math.ceil(max / step))
  return Array.from({ length: steps + 1 }, (_, i) => roundTo(i * step, 6))
}

// Maps a value in `domain` linearly onto `range` (which may run backwards, as an SVG y axis does).
export function scaleLinear(domain: [number, number], range: [number, number]): (value: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  return (value) => (d1 === d0 ? r0 : r0 + ((value - d0) / (d1 - d0)) * (r1 - r0))
}

const coordinate = (point: Point) => `${roundTo(point.x, 1)} ${roundTo(point.y, 1)}`

// An SVG path through the points; empty for none.
export function linePath(points: Point[]): string {
  return points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${coordinate(point)}`).join(' ')
}

// A closed SVG path for the band between two lines: along `upper`, back along `lower`.
export function areaPath(upper: Point[], lower: Point[]): string {
  if (upper.length === 0) return ''
  return `${linePath(upper)} ${[...lower].reverse().map((point) => `L ${coordinate(point)}`).join(' ')} Z`
}

// Which of `count` evenly spaced items get a label so that no more than `max` do.
export function labelIndexes(count: number, max: number): number[] {
  if (count <= 0) return []
  const step = Math.max(1, Math.ceil((count - 1) / Math.max(1, max - 1)))
  return Array.from({ length: count }, (_, i) => i).filter((i) => i % step === 0)
}

// The item of `count` evenly spaced ones across [left, right] that x is nearest to.
export function nearestIndex(x: number, left: number, right: number, count: number): number {
  if (count <= 1 || right <= left) return 0
  return Math.min(count - 1, Math.max(0, Math.round(((x - left) / (right - left)) * (count - 1))))
}

// Stacks series (each one value per position) one on top of the other: the
// first series sits on the axis. Gives the lower and upper edge of each band.
export function stackBands(series: number[][]): { lower: number[]; upper: number[] }[] {
  const base: number[] = (series[0] ?? []).map(() => 0)
  return series.map((values) => {
    const lower = [...base]
    const upper = values.map((value, i) => lower[i] + value)
    upper.forEach((top, i) => { base[i] = top })
    return { lower, upper }
  })
}
