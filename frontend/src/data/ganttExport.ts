import { differenceInCalendarDays, eachMonthOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { donePercent, type Scheduled } from '@/data/schedule'

export const EXPORT_LABEL_WIDTH = 240
export const EXPORT_CHART_WIDTH = 960
export const EXPORT_ROW_HEIGHT = 28
export const EXPORT_HEADER_HEIGHT = 32

export interface ExportRow {
  title: string
  depth: number
  y: number
  critical: boolean
  // Null for an undated row (shown as a label with no bar).
  bar: { x: number; width: number; doneWidth: number } | null
}

export interface GanttExportLayout {
  width: number
  height: number
  months: { label: string; x: number; width: number }[]
  rows: ExportRow[]
  // x of today's line, or null when today is outside the range.
  todayX: number | null
}

// Where everything goes on the exported image: a month header over the chart,
// one row per item with its bar placed by date, and today's line. Pure, so the
// drawing code only paints rectangles and text. Items with no dates are listed
// without a bar; with no dated items at all the range is the current month.
export function ganttExportLayout(items: Scheduled[], today: Date = new Date()): GanttExportLayout {
  const dated = items.filter((i) => i.start_date && i.target_date)
  const starts = dated.map((i) => parseISO(i.start_date as string).getTime())
  const ends = dated.map((i) => parseISO(i.target_date as string).getTime())
  const rangeStart = startOfMonth(starts.length ? new Date(Math.min(...starts)) : today)
  const rangeEnd = endOfMonth(ends.length ? new Date(Math.max(...ends)) : today)
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const x = (date: Date) => EXPORT_LABEL_WIDTH + (differenceInCalendarDays(date, rangeStart) / totalDays) * EXPORT_CHART_WIDTH

  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd }).map((m) => {
    const days = differenceInCalendarDays(endOfMonth(m), startOfMonth(m)) + 1
    return { label: format(m, 'MMM yyyy'), x: x(startOfMonth(m)), width: (days / totalDays) * EXPORT_CHART_WIDTH }
  })

  const rows = items.map((item, i): ExportRow => {
    const y = EXPORT_HEADER_HEIGHT + i * EXPORT_ROW_HEIGHT
    if (!item.start_date || !item.target_date) return { title: item.title, depth: item.depth ?? 0, y, critical: Boolean(item.critical), bar: null }
    const left = x(parseISO(item.start_date))
    const right = x(parseISO(item.target_date)) + EXPORT_CHART_WIDTH / totalDays // the due day is inclusive
    const width = Math.max(right - left, 4)
    return { title: item.title, depth: item.depth ?? 0, y, critical: Boolean(item.critical), bar: { x: left, width, doneWidth: (width * donePercent(item)) / 100 } }
  })

  const inRange = today >= rangeStart && today <= rangeEnd
  return {
    width: EXPORT_LABEL_WIDTH + EXPORT_CHART_WIDTH,
    height: EXPORT_HEADER_HEIGHT + items.length * EXPORT_ROW_HEIGHT + 8,
    months,
    rows,
    todayX: inRange ? x(today) + EXPORT_CHART_WIDTH / totalDays / 2 : null,
  }
}

// A safe file name for the download, like "Launch plan gantt.png".
export function ganttFileName(folderName: string, extension = 'png'): string {
  const base = folderName.replace(/[^\w .-]+/g, '').trim() || 'Gantt'
  return `${base} gantt.${extension}`
}
