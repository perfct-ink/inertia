import { useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { format, parseISO } from 'date-fns'
import { Flag, Loader2, Map as MapIcon, Target } from 'lucide-react'
import { Button, HealthBadge, Select, classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar, Timeline } from '@/components/Timeline'
import { useMilestones } from '@/api/milestones'
import { useInitiatives, useUpdateInitiative } from '@/api/initiatives'
import { useEpics, useUpdateEpic } from '@/api/epics'
import { donePercent } from '@/data/schedule'
import {
  HORIZONS, HORIZON_LABEL, boardColumns, effectiveHorizon, roadmapLanes, roadmapRange, type BoardCard,
} from '@/data/roadmap'
import { usePageTitle } from '@/hooks/usePageTitle'
import type { Epic, Initiative, Milestone, RoadmapHorizon } from '@/types'
import '../planning/PlanningScreen.scss'
import './RoadmapScreen.scss'

type View = 'timeline' | 'board'

export default function RoadmapScreen() {
  usePageTitle('Roadmap')
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const view: View = searchParams.get('view') === 'board' ? 'board' : 'timeline'
  const { data: milestones = [], isLoading: loadingMilestones } = useMilestones()
  const { data: initiatives = [], isLoading: loadingInitiatives } = useInitiatives()
  const { data: epics = [], isLoading: loadingEpics } = useEpics()
  const isLoading = loadingMilestones || loadingInitiatives || loadingEpics

  return (
    <WorkspaceLayout>
      <div className="view-planning view-roadmap">
        <div className="planning-header">
          <h1 className="planning-title">Roadmap</h1>
          <div className="planning-tabs">
            {(['timeline', 'board'] as View[]).map((v) => (
              <Button
                key={v}
                onClick={() => navigate(`/roadmap?view=${v}`)}
                aria-pressed={view === v}
                className={classNames('planning-tab', view === v && 'planning-tab--active')}
              >
                {v === 'timeline' ? 'Timeline' : 'Now / Next / Later'}
              </Button>
            ))}
          </div>
        </div>

        <div className="planning-body">
          {isLoading && (
            <div className="planning-loading">
              <Loader2 className="planning-spinner" aria-label="Loading" />
            </div>
          )}

          {!isLoading && initiatives.length === 0 && epics.length === 0 && (
            <div className="planning-empty">
              <MapIcon className="planning-empty_icon" aria-hidden="true" />
              <p>Add initiatives or epics to see them on the roadmap.</p>
            </div>
          )}

          {!isLoading && (initiatives.length > 0 || epics.length > 0) && (
            view === 'timeline'
              ? <RoadmapTimeline milestones={milestones} initiatives={initiatives} epics={epics} />
              : <RoadmapBoard initiatives={initiatives} epics={epics} />
          )}
        </div>
      </div>
    </WorkspaceLayout>
  )
}

function RoadmapTimeline({ milestones, initiatives, epics }: { milestones: Milestone[]; initiatives: Initiative[]; epics: Epic[] }) {
  const lanes = useMemo(() => roadmapLanes(milestones, initiatives, epics), [milestones, initiatives, epics])
  const range = useMemo(() => roadmapRange(lanes) ?? undefined, [lanes])

  return (
    <div className="roadmap-lanes">
      {lanes.map((lane) => (
        <section key={lane.key} className="roadmap-lane" aria-label={lane.milestone?.title ?? 'No milestone'}>
          <header className="roadmap-lane-header">
            <h2 className="roadmap-lane-title">{lane.milestone?.title ?? 'No milestone'}</h2>
            {lane.milestone?.target_date && (
              <span className="roadmap-lane-date">{format(parseISO(lane.milestone.target_date), 'MMM d, yyyy')}</span>
            )}
            {lane.milestone && <HealthBadge health={lane.milestone.health} />}
            {lane.milestone && (
              <div className="roadmap-lane-progress">
                <ProgressBar percent={lane.milestone.percent} />
                <span className="roadmap-lane-percent">{lane.milestone.percent}%</span>
              </div>
            )}
          </header>
          {lane.rows.length === 0
            ? <p className="roadmap-lane-empty">Nothing planned under this milestone yet.</p>
            : (
              <Timeline
                items={lane.rows}
                range={range}
                milestones={lane.milestone?.target_date ? [{ id: lane.milestone.id, title: lane.milestone.title, target_date: lane.milestone.target_date }] : []}
              />
            )}
        </section>
      ))}
    </div>
  )
}

function RoadmapBoard({ initiatives, epics }: { initiatives: Initiative[]; epics: Epic[] }) {
  const updateInitiative = useUpdateInitiative()
  const updateEpic = useUpdateEpic()
  const columns = useMemo(() => boardColumns(initiatives, epics), [initiatives, epics])
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  )

  // null puts the card back on automatic placement.
  function place(card: BoardCard, horizon: RoadmapHorizon | null) {
    if (card.kind === 'initiative') updateInitiative.mutate({ id: card.item.id, horizon })
    else updateEpic.mutate({ id: card.item.id, horizon })
  }

  function handleDragEnd(event: DragEndEvent) {
    const target = event.over?.id as RoadmapHorizon | undefined
    const card = event.active.data.current?.card as BoardCard | undefined
    if (!target || !card || effectiveHorizon(card.item) === target) return
    place(card, target)
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="roadmap-board">
        {HORIZONS.map((horizon) => (
          <BoardColumn key={horizon} horizon={horizon} cards={columns[horizon]} onPlace={place} />
        ))}
      </div>
    </DndContext>
  )
}

function BoardColumn({ horizon, cards, onPlace }: {
  horizon: RoadmapHorizon
  cards: BoardCard[]
  onPlace: (card: BoardCard, horizon: RoadmapHorizon | null) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: horizon })
  return (
    <section
      ref={setNodeRef}
      className={classNames('roadmap-column', isOver && 'roadmap-column--over')}
      aria-labelledby={`roadmap-column-${horizon}`}
    >
      <h2 id={`roadmap-column-${horizon}`} className="roadmap-column-title">
        {HORIZON_LABEL[horizon]}
        <span className="roadmap-column-count">{cards.length}</span>
      </h2>
      {cards.map((card) => <BoardCardView key={card.key} card={card} onPlace={onPlace} />)}
    </section>
  )
}

function BoardCardView({ card, onPlace }: { card: BoardCard; onPlace: (card: BoardCard, horizon: RoadmapHorizon | null) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.key, data: { card } })
  const Icon = card.kind === 'initiative' ? Flag : Target
  const item = card.item

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={classNames('roadmap-card', isDragging && 'roadmap-card--dragging')}
      {...attributes}
      {...listeners}
      // A group, not dnd-kit's default button: the card holds its own select.
      role="group"
      aria-label={`${item.title}, ${card.kind}`}
    >
      <div className="roadmap-card-top">
        <Icon className="roadmap-card-icon" aria-hidden="true" />
        <h3 className="roadmap-card-title">{item.title}</h3>
        {card.kind === 'initiative' && <HealthBadge health={card.item.health} />}
      </div>
      {card.kind === 'initiative' && card.epics.length > 0 && (
        <p className="roadmap-card-meta">{card.epics.length} {card.epics.length === 1 ? 'epic' : 'epics'}</p>
      )}
      {item.target_date && <p className="roadmap-card-meta">Target {format(parseISO(item.target_date), 'MMM d, yyyy')}</p>}
      <div className="roadmap-card-progress">
        <ProgressBar percent={donePercent(item)} />
        <span className="roadmap-card-count">{item.done_tasks_count}/{item.tasks_count}</span>
      </div>
      {/* Keyboard/screen-reader path to the same move as dragging. */}
      <Select
        aria-label={`Column for ${item.title}`}
        value={item.horizon ?? ''}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        onChange={(e) => onPlace(card, (e.target.value || null) as RoadmapHorizon | null)}
        className="roadmap-card-horizon"
      >
        <option value="">Automatic ({HORIZON_LABEL[effectiveHorizon({ ...item, horizon: null })]})</option>
        {HORIZONS.map((h) => <option key={h} value={h}>{HORIZON_LABEL[h]}</option>)}
      </Select>
    </article>
  )
}
