import { format, parseISO } from 'date-fns'
import { StatusDot } from '@/components/ui'
import { areaPath, axisTicks, labelIndexes, linePath, scaleLinear, stackBands, type Point } from '@/util/chart'
import { FLOW_STACK, workLabel, type Burndown, type FlowDay, type ReportMeasure, type ScopeRow, type Velocity } from '@/data/report'
import type { BoardStatuses } from '@/data/task_status'

// The report charts, drawn as plain SVG from what data/report.ts returns (no
// charting library). Colours come from the stylesheet, so they follow the theme.
// Each chart has a caption that says what it shows and a table of the numbers
// for anyone who can't see or read the drawing.

const WIDTH = 640
const HEIGHT = 300
const LEFT = 44
const RIGHT = WIDTH - 16
const TOP = 16
const BOTTOM = HEIGHT - 40

const shortDate = (day: string) => format(parseISO(day), 'MMM d')
const truncate = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text)

// The axes and gridlines every chart shares. `labels` are the x labels, one per position.
function Frame({ title, caption, ticks, labels, children }: {
  title: string
  caption: string
  ticks: number[]
  labels: string[]
  children: (scales: { x: (index: number) => number; y: (value: number) => number }) => React.ReactNode
}) {
  const top = ticks[ticks.length - 1]
  const y = scaleLinear([0, top], [BOTTOM, TOP])
  const x = scaleLinear([0, Math.max(1, labels.length - 1)], [LEFT, RIGHT])
  return (
    <figure className="reports-figure">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label={title} className="reports-chart">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className="reports-grid" />
            <text x={LEFT - 6} y={y(tick)} className="reports-tick reports-tick--y" dominantBaseline="middle">{tick}</text>
          </g>
        ))}
        {labelIndexes(labels.length, 7).map((i) => (
          <text key={i} x={x(i)} y={BOTTOM + 18} className="reports-tick reports-tick--x">{labels[i]}</text>
        ))}
        {children({ x, y })}
      </svg>
      <figcaption className="reports-caption">{caption}</figcaption>
    </figure>
  )
}

// A numbers table behind a "Show the numbers" disclosure.
export function ReportTable({ caption, columns, rows }: { caption: string; columns: string[]; rows: (string | number)[][] }) {
  return (
    <details className="reports-details">
      <summary>Show the numbers</summary>
      <div className="reports-table_wrap">
        <table className="reports-table">
          <caption>{caption}</caption>
          <thead>
            <tr>{columns.map((column, i) => <th key={column} scope="col" className={i === 0 ? 'reports-table-first' : undefined}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

// The points of a series, skipping days with no value (days still to come).
function seriesPoints(values: (number | null)[], x: (i: number) => number, y: (v: number) => number): Point[] {
  const points: Point[] = []
  values.forEach((value, i) => { if (value !== null) points.push({ x: x(i), y: y(value) }) })
  return points
}

export function BurndownChart({ data, title, measure }: { data: Burndown; title: string; measure: ReportMeasure }) {
  const { days } = data
  const last = [...days].reverse().find((day) => day.remaining !== null)
  const max = Math.max(1, data.planned, ...days.map((day) => day.scope ?? 0))
  const caption = last
    ? `${title}: ${workLabel(last.remaining ?? 0, measure)} left on ${shortDate(last.date)}, from ${workLabel(data.planned, measure)} planned at the start.`
    : `${title}: it has not started yet.`
  return (
    <>
      <Frame title={`Burndown of ${title}`} caption={caption} ticks={axisTicks(max)} labels={days.map((day) => shortDate(day.date))}>
        {({ x, y }) => (
          <>
            <path d={linePath(days.map((day, i) => ({ x: x(i), y: y(day.ideal) })))} className="reports-line reports-line--ideal" />
            <path d={linePath(seriesPoints(days.map((day) => day.scope), x, y))} className="reports-line reports-line--scope" />
            <path d={linePath(seriesPoints(days.map((day) => day.remaining), x, y))} className="reports-line reports-line--remaining" />
            {days.map((day, i) => day.remaining !== null && (
              <circle key={day.date} cx={x(i)} cy={y(day.remaining)} r={3} className="reports-dot">
                <title>{`${shortDate(day.date)}: ${workLabel(day.remaining, measure)} left`}</title>
              </circle>
            ))}
          </>
        )}
      </Frame>
      <ul className="reports-legend" aria-label="Legend">
        <li><span className="reports-swatch reports-swatch--remaining" aria-hidden="true" />Remaining</li>
        <li><span className="reports-swatch reports-swatch--ideal" aria-hidden="true" />Ideal</li>
        <li><span className="reports-swatch reports-swatch--scope" aria-hidden="true" />Scope</li>
      </ul>
      <ReportTable
        caption={`${title}, per day`}
        columns={['Day', 'Ideal', 'Scope', 'Remaining']}
        rows={days.map((day) => [shortDate(day.date), day.ideal, day.scope ?? '', day.remaining ?? ''])}
      />
    </>
  )
}

export function VelocityChart({ data, measure }: { data: Velocity; measure: ReportMeasure }) {
  const { bars, average } = data
  const max = Math.max(1, average ?? 0, ...bars.map((bar) => bar.completed))
  const ticks = axisTicks(max)
  const caption = average === null
    ? 'No sprint has finished yet, so there is no average. The running sprint counts what is done so far.'
    : `Average of the last finished sprints: ${workLabel(average, measure)} per sprint.`
  const slot = (RIGHT - LEFT) / Math.max(1, bars.length)
  const barWidth = Math.min(64, slot * 0.6)
  const y = scaleLinear([0, ticks[ticks.length - 1]], [BOTTOM, TOP])
  return (
    <>
      <figure className="reports-figure">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Velocity by sprint" className="reports-chart">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className="reports-grid" />
              <text x={LEFT - 6} y={y(tick)} className="reports-tick reports-tick--y" dominantBaseline="middle">{tick}</text>
            </g>
          ))}
          {bars.map((bar, i) => {
            const centre = LEFT + slot * (i + 0.5)
            return (
              <g key={bar.sprintId}>
                <rect x={centre - barWidth / 2} y={y(bar.completed)} width={barWidth} height={BOTTOM - y(bar.completed)} className={bar.active ? 'reports-bar reports-bar--active' : 'reports-bar'}>
                  <title>{`${bar.title}: ${workLabel(bar.completed, measure)}${bar.active ? ' so far' : ''}`}</title>
                </rect>
                <text x={centre} y={y(bar.completed) - 6} className="reports-value">{bar.completed}</text>
                <text x={centre} y={BOTTOM + 18} className="reports-tick reports-tick--x">{truncate(bar.title, 12)}</text>
              </g>
            )
          })}
          {average !== null && (
            <line x1={LEFT} x2={RIGHT} y1={y(average)} y2={y(average)} className="reports-line reports-line--average">
              <title>{`Average: ${workLabel(average, measure)}`}</title>
            </line>
          )}
        </svg>
        <figcaption className="reports-caption">{caption}</figcaption>
      </figure>
      <ReportTable
        caption="Velocity per sprint"
        columns={['Sprint', measure === 'points' ? 'Points done' : 'Tasks done', 'Tasks done', 'State']}
        rows={bars.map((bar) => [bar.title, bar.completed, bar.tasksDone, bar.active ? 'Running' : 'Finished'])}
      />
    </>
  )
}

export function FlowChart({ days, statuses, measure }: { days: FlowDay[]; statuses: BoardStatuses; measure: ReportMeasure }) {
  const bands = stackBands(FLOW_STACK.map((status) => days.map((day) => day.counts[status])))
  const max = Math.max(1, ...bands[bands.length - 1].upper)
  const last = days[days.length - 1]
  const caption = last ? `Work in each status at the end of each day, up to ${shortDate(last.date)}.` : 'No days to show.'
  return (
    <>
      <Frame title="Cumulative flow" caption={caption} ticks={axisTicks(max)} labels={days.map((day) => shortDate(day.date))}>
        {({ x, y }) => bands.map((band, b) => (
          <path
            key={FLOW_STACK[b]}
            d={areaPath(band.upper.map((v, i) => ({ x: x(i), y: y(v) })), band.lower.map((v, i) => ({ x: x(i), y: y(v) })))}
            className={`reports-band reports-band--${statuses[FLOW_STACK[b]].color}`}
          >
            <title>{statuses[FLOW_STACK[b]].label}</title>
          </path>
        ))}
      </Frame>
      <ul className="reports-legend" aria-label="Legend">
        {[...FLOW_STACK].reverse().map((status) => (
          <li key={status}><StatusDot color={statuses[status].color} />{statuses[status].label}</li>
        ))}
      </ul>
      <ReportTable
        caption={`Work in each status per day (${measure === 'points' ? 'story points' : 'tasks'})`}
        columns={['Day', ...FLOW_STACK.map((status) => statuses[status].label)]}
        rows={days.map((day) => [shortDate(day.date), ...FLOW_STACK.map((status) => day.counts[status])])}
      />
    </>
  )
}

export function ScopeChart({ rows, measure }: { rows: ScopeRow[]; measure: ReportMeasure }) {
  const max = Math.max(1, ...rows.map((row) => row.planned.total + row.unplanned.total))
  const ticks = axisTicks(max)
  const slot = (RIGHT - LEFT) / Math.max(1, rows.length)
  const barWidth = Math.min(64, slot * 0.6)
  const y = scaleLinear([0, ticks[ticks.length - 1]], [BOTTOM, TOP])
  return (
    <>
      <figure className="reports-figure">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Planned and unplanned work by sprint" className="reports-chart">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className="reports-grid" />
              <text x={LEFT - 6} y={y(tick)} className="reports-tick reports-tick--y" dominantBaseline="middle">{tick}</text>
            </g>
          ))}
          {rows.map((row, i) => {
            const centre = LEFT + slot * (i + 0.5)
            const plannedTop = y(row.planned.total)
            const unplannedTop = y(row.planned.total + row.unplanned.total)
            return (
              <g key={row.sprintId}>
                <rect x={centre - barWidth / 2} y={plannedTop} width={barWidth} height={BOTTOM - plannedTop} className="reports-bar">
                  <title>{`${row.title}, planned: ${workLabel(row.planned.total, measure)}`}</title>
                </rect>
                <rect x={centre - barWidth / 2} y={unplannedTop} width={barWidth} height={plannedTop - unplannedTop} className="reports-bar reports-bar--unplanned">
                  <title>{`${row.title}, added after it began: ${workLabel(row.unplanned.total, measure)}`}</title>
                </rect>
                {row.unplanned.total > 0 && <text x={centre} y={unplannedTop - 6} className="reports-value">{row.unplannedPercent}%</text>}
                <text x={centre} y={BOTTOM + 18} className="reports-tick reports-tick--x">{truncate(row.title, 12)}</text>
              </g>
            )
          })}
        </svg>
        <figcaption className="reports-caption">Work in each sprint that was there when it began, and work added after. The percentage is the added share.</figcaption>
      </figure>
      <ul className="reports-legend" aria-label="Legend">
        <li><span className="reports-swatch reports-swatch--planned" aria-hidden="true" />Planned</li>
        <li><span className="reports-swatch reports-swatch--unplanned" aria-hidden="true" />Added after the start</li>
      </ul>
      <ReportTable
        caption={`Planned and unplanned work per sprint (${measure === 'points' ? 'story points' : 'tasks'})`}
        columns={['Sprint', 'Planned', 'Planned done', 'Added', 'Added done', 'Added share']}
        rows={rows.map((row) => [row.title, row.planned.total, row.planned.done, row.unplanned.total, row.unplanned.done, `${row.unplannedPercent}%`])}
      />
    </>
  )
}
