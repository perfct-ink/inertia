import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import {
  format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, differenceInCalendarDays,
} from 'date-fns'
import './Timeline.scss'
import { classNames } from '@/components/ui'
import { donePercent, shiftedRange, type DragMode, type Scheduled } from '@/data/schedule'
import { linkSides, type BarSide } from '@/data/dependency'
import type { DependencyKind } from '@/types'

// Shared by EpicsPage, InitiativesPage, and FolderDetailPage's per-folder
// Gantt tab — all three are "a title, an optional start/target date, and a
// tasks_count/done_tasks_count rollup," so one renderer covers all of them
// instead of near-identical copies drifting apart.
export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="timeline-progress">
      <div className="timeline-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

type Dated = Scheduled & { start_date: string; target_date: string }

// Read-only unless `onReschedule` is passed (see TimelineBar); otherwise dates
// are edited from each page's own List view inputs. Only
// items with both a start and target date can be placed on the month grid;
// the rest are named below it instead of silently dropped. No charting
// library — plain CSS percentages against a computed day range.
export type TimelineMilestone = { id: number; title: string; target_date: string }

// A dependency arrow between two rows, named by row key (Scheduled.key, or
// the id as a string). Links to rows that aren't drawn are skipped.
export type TimelineLink = { from: string; to: string; kind: DependencyKind }

// Row geometry in rem, matching .timeline-track (height space(6)) and the
// .timeline-rows gap (space(3)); the link overlay lays rows out on this pitch.
const ROW_HEIGHT_REM = 1.5
const ROW_PITCH_REM = 2.25
// How far (in % of the track) an arrow leaves its bar before turning.
const LINK_STUB_PCT = 0.8

// Called when a link is dragged from one bar side onto another bar's side.
export type TimelineLinkDraw = (from: { key: string; side: BarSide }, to: { key: string; side: BarSide }) => void

type LinkDrag = { key: string; side: BarSide; x1: number; y1: number; x2: number; y2: number }

export type TimelineReschedule = (item: Scheduled, startDate: string, targetDate: string) => void

// One bar. When `onReschedule` is given it can be dragged to move, or by its
// left/right edge to resize, snapping to whole days; the dates are committed
// on release. Pointer-based, so it needs no library.
function TimelineBar({ item, offsetPct, widthPct, totalDays, onReschedule, onLinkStart }: {
  item: Dated
  offsetPct: number
  widthPct: number
  totalDays: number
  onReschedule?: TimelineReschedule
  onLinkStart?: (key: string, side: BarSide, e: ReactPointerEvent<HTMLElement>) => void
}) {
  const barRef = useRef<HTMLDivElement>(null)
  const origin = useRef({ x: 0, trackWidth: 1 })
  const [drag, setDrag] = useState<{ mode: DragMode; delta: number } | null>(null)

  const preview = drag ? shiftedRange(item.start_date, item.target_date, drag.mode, drag.delta) : null
  const startShift = preview ? differenceInCalendarDays(parseISO(preview.start), parseISO(item.start_date)) : 0
  const endShift = preview ? differenceInCalendarDays(parseISO(preview.end), parseISO(item.target_date)) : 0
  const left = offsetPct + (startShift / totalDays) * 100
  const width = Math.max(widthPct + ((endShift - startShift) / totalDays) * 100, 1.5)

  function begin(e: ReactPointerEvent, mode: DragMode) {
    if (!onReschedule) return
    e.stopPropagation()
    barRef.current?.setPointerCapture(e.pointerId)
    origin.current = { x: e.clientX, trackWidth: barRef.current?.parentElement?.clientWidth || 1 }
    setDrag({ mode, delta: 0 })
  }

  function move(e: ReactPointerEvent) {
    if (!drag) return
    const delta = Math.round(((e.clientX - origin.current.x) / origin.current.trackWidth) * totalDays)
    if (delta !== drag.delta) setDrag({ mode: drag.mode, delta })
  }

  function end() {
    if (drag && preview && drag.delta !== 0) onReschedule?.(item, preview.start, preview.end)
    setDrag(null)
  }

  return (
    <div
      ref={barRef}
      className={classNames(
        'timeline-bar',
        item.health && `timeline-bar--${item.health}`,
        item.critical && 'timeline-bar--critical',
        onReschedule && 'timeline-bar--editable',
        drag && 'timeline-bar--dragging',
      )}
      style={{ left: `${left}%`, width: `${width}%` }}
      title={preview ? `${preview.start} → ${preview.end}` : `${item.start_date} → ${item.target_date}`}
      onPointerDown={(e) => begin(e, 'move')}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={() => setDrag(null)}
    >
      <div className="timeline-bar-fill" style={{ width: `${donePercent(item)}%` }} />
      {onReschedule && (
        <>
          <span className="timeline-bar-handle timeline-bar-handle--start" onPointerDown={(e) => begin(e, 'start')} />
          <span className="timeline-bar-handle timeline-bar-handle--end" onPointerDown={(e) => begin(e, 'end')} />
        </>
      )}
      {onLinkStart && (['start', 'end'] as const).map((side) => (
        <span
          key={side}
          className={`timeline-bar-link timeline-bar-link--${side}`}
          data-link-key={item.key ?? String(item.id)}
          data-link-side={side}
          title={`Drag to another task to link from this task's ${side}`}
          onPointerDown={(e) => onLinkStart(item.key ?? String(item.id), side, e)}
        />
      ))}
    </div>
  )
}

// Milestones are diamonds on a marker row above the bars. Ones outside the
// bars' month range are left off rather than stretching the axis.
// `range` pins the axis (the roadmap stacks one Timeline per lane and needs
// their months to line up); without it the axis fits this list's own dates.
export function Timeline({ items, milestones = [], range, links = [], onReschedule, onLink, canLink }: {
  items: Scheduled[]
  milestones?: TimelineMilestone[]
  range?: { start: Date; end: Date }
  links?: TimelineLink[]
  // Makes bars draggable (move / resize); absent keeps the chart read-only.
  onReschedule?: TimelineReschedule
  // Shows link handles on each bar side; dropping on another bar's side calls this.
  onLink?: TimelineLinkDraw
  // Limits which rows get link handles (default: all).
  canLink?: (item: Scheduled) => boolean
}) {
  const rowsRef = useRef<HTMLDivElement>(null)
  const [linking, setLinking] = useState<LinkDrag | null>(null)
  const onLinkRef = useRef(onLink)
  onLinkRef.current = onLink
  const linkingRef = useRef(linking)
  linkingRef.current = linking

  // While a link is being dragged, follow the pointer and resolve the drop on release.
  const isLinking = linking !== null
  useEffect(() => {
    if (!isLinking) return
    const rowsTop = () => rowsRef.current?.getBoundingClientRect()
    function move(e: PointerEvent) {
      const box = rowsTop()
      if (box) setLinking((l) => (l ? { ...l, x2: e.clientX - box.left, y2: e.clientY - box.top } : l))
    }
    function up(e: PointerEvent) {
      const l = linkingRef.current
      const target = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>('[data-link-side]')
      if (l && target?.dataset.linkKey && target.dataset.linkKey !== l.key) {
        onLinkRef.current?.({ key: l.key, side: l.side }, { key: target.dataset.linkKey, side: target.dataset.linkSide as BarSide })
      }
      setLinking(null)
    }
    function cancel(e: KeyboardEvent) {
      if (e.key === 'Escape') setLinking(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', cancel)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', cancel)
    }
  }, [isLinking])

  function startLink(key: string, side: BarSide, e: ReactPointerEvent<HTMLElement>) {
    e.stopPropagation()
    e.preventDefault()
    const box = rowsRef.current?.getBoundingClientRect()
    const handle = e.currentTarget.getBoundingClientRect()
    if (!box) return
    const x = handle.left + handle.width / 2 - box.left
    const y = handle.top + handle.height / 2 - box.top
    setLinking({ key, side, x1: x, y1: y, x2: x, y2: y })
  }

  const dated = items.filter((e): e is Dated => Boolean(e.start_date && e.target_date))
  const undated = items.filter((e) => !e.start_date || !e.target_date)

  if (dated.length === 0) {
    return (
      <div className="view-timeline view-timeline--empty">
        <p>Set a start and target date to see it here</p>
        {undated.length > 0 && <p className="timeline-undated">Undated: {undated.map((e) => e.title).join(', ')}</p>}
      </div>
    )
  }

  const rangeStart = range?.start ?? startOfMonth(new Date(Math.min(...dated.map((e) => parseISO(e.start_date).getTime()))))
  const rangeEnd = range?.end ?? endOfMonth(new Date(Math.max(...dated.map((e) => parseISO(e.target_date).getTime()))))
  const totalDays = differenceInCalendarDays(rangeEnd, rangeStart) + 1
  const months = eachMonthOfInterval({ start: rangeStart, end: rangeEnd })

  const markers = milestones
    .map((m) => ({ ...m, date: parseISO(m.target_date) }))
    .filter((m) => m.date >= rangeStart && m.date <= rangeEnd)
    .map((m) => ({ ...m, offsetPct: ((differenceInCalendarDays(m.date, rangeStart) + 0.5) / totalDays) * 100 }))

  const bars = dated.map((item) => {
    const s = parseISO(item.start_date)
    const e = parseISO(item.target_date)
    const offsetPct = (differenceInCalendarDays(s, rangeStart) / totalDays) * 100
    const widthPct = Math.max(((differenceInCalendarDays(e, s) + 1) / totalDays) * 100, 1.5)
    return { item, offsetPct, widthPct }
  })
  const rowIndex = new Map(bars.map((bar, i) => [bar.item.key ?? String(bar.item.id), i]))
  const arrows = links.flatMap((link) => {
    const from = rowIndex.get(link.from)
    const to = rowIndex.get(link.to)
    if (from === undefined || to === undefined) return []
    const sides = linkSides(link.kind)
    const edge = (i: number, side: 'start' | 'end') => bars[i].offsetPct + (side === 'end' ? bars[i].widthPct : 0)
    const fromX = edge(from, sides.from)
    const turnX = fromX + (sides.from === 'end' ? LINK_STUB_PCT : -LINK_STUB_PCT)
    const toX = edge(to, sides.to)
    const y = (i: number) => i * ROW_PITCH_REM + ROW_HEIGHT_REM / 2
    return [{
      key: `${link.from}>${link.to}`,
      d: `M ${fromX} ${y(from)} H ${turnX} V ${y(to)} H ${toX}`,
      toX,
      toY: y(to),
      pointsLeft: toX < turnX,
    }]
  })
  const linksHeight = bars.length * ROW_PITCH_REM - (ROW_PITCH_REM - ROW_HEIGHT_REM)

  const today = new Date()
  const todayPct = today >= rangeStart && today <= rangeEnd
    ? ((differenceInCalendarDays(today, rangeStart) + 0.5) / totalDays) * 100
    : null

  return (
    <div className="view-timeline">
      <div className="timeline-chart">
        <div className="timeline-months">
          {months.map((m) => {
            const daysInMonth = differenceInCalendarDays(endOfMonth(m), startOfMonth(m)) + 1
            return (
              <div
                key={m.toISOString()}
                style={{ width: `${(daysInMonth / totalDays) * 100}%` }}
                className="timeline-month"
              >
                {format(m, 'MMM yyyy')}
              </div>
            )
          })}
        </div>
        {markers.length > 0 && (
          <div className="timeline-row timeline-markers">
            <span className="timeline-title">Milestones</span>
            <div className="timeline-track">
              {markers.map((m) => (
                <span
                  key={m.id}
                  className="timeline-milestone"
                  style={{ left: `${m.offsetPct}%` }}
                  title={`${m.title} — ${m.target_date}`}
                  role="img"
                  aria-label={`Milestone ${m.title}, ${m.target_date}`}
                />
              ))}
            </div>
            <span className="timeline-count" />
          </div>
        )}
        <div className="timeline-rows" ref={rowsRef}>
          {todayPct !== null && (
            <div className="timeline-today_area" aria-hidden="true">
              <span className="timeline-today" style={{ left: `${todayPct}%` }} title="Today" />
            </div>
          )}
          {arrows.length > 0 && (
            <div className="timeline-links" aria-hidden="true">
              <svg viewBox={`0 0 100 ${linksHeight}`} preserveAspectRatio="none" className="timeline-links-svg">
                {arrows.map((a) => <path key={a.key} d={a.d} className="timeline-link" vectorEffect="non-scaling-stroke" />)}
              </svg>
              {arrows.map((a) => (
                <span
                  key={a.key}
                  className={classNames('timeline-link-head', a.pointsLeft && 'timeline-link-head--left')}
                  style={{ left: `${a.toX}%`, top: `${a.toY}rem` }}
                />
              ))}
            </div>
          )}
          {linking && (
            <svg className="timeline-linking" aria-hidden="true">
              <line x1={linking.x1} y1={linking.y1} x2={linking.x2} y2={linking.y2} className="timeline-linking-line" />
            </svg>
          )}
          {bars.map(({ item, offsetPct, widthPct }) => {
            return (
              <div key={item.key ?? item.id} className="timeline-row">
                <span
                  className="timeline-title"
                  title={item.title}
                  style={item.depth ? { paddingLeft: `${item.depth}rem` } : undefined}
                >
                  {item.title}
                </span>
                <div className="timeline-track">
                  <TimelineBar item={item} offsetPct={offsetPct} widthPct={widthPct} totalDays={totalDays} onReschedule={onReschedule} onLinkStart={onLink && (!canLink || canLink(item)) ? startLink : undefined} />
                </div>
                <span className="timeline-count">
                  {item.done_tasks_count}/{item.tasks_count}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {undated.length > 0 && (
        <p className="timeline-undated">
          Not shown (missing a start or target date): {undated.map((e) => e.title).join(', ')}
        </p>
      )}
    </div>
  )
}
