import { useMemo, useState, type ComponentType } from 'react'
import {
  DndContext, PointerSensor, pointerWithin, useDndContext, useDraggable, useDroppable, useSensor, useSensors,
  type CollisionDetection, type DragEndEvent, type DragMoveEvent,
} from '@dnd-kit/core'
import { ChevronRight, Milestone as MilestoneIcon, Flag, Target, CheckSquare, Loader2, Move } from 'lucide-react'
import { Button, classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { donePercent } from '@/data/schedule'
import {
  UNASSIGNED_KEY, buildHierarchy, dropOptions, dropPlacement, findNode, planDrop,
  type HierarchyNode, type HierarchyKind, type Placement,
} from '@/data/hierarchy'
import { useMilestones } from '@/api/milestones'
import { useInitiatives } from '@/api/initiatives'
import { useEpics } from '@/api/epics'
import { useTasks } from '@/api/tasks'
import { useMoveHierarchyItem } from '@/api/hierarchy'
import { usePageTitle } from '@/hooks/usePageTitle'
import MoveDialog from './MoveDialog'
import './HierarchyScreen.scss'

const KIND_ICON: Record<HierarchyKind, ComponentType<{ className?: string }>> = {
  milestone: MilestoneIcon,
  initiative: Flag,
  epic: Target,
  task: CheckSquare,
}

// Where the dragged row would land: on the row named by `key`, before, inside or after it.
interface DropState {
  key: string
  placement: Placement
}

// The row under the pointer wins over the Unassigned section that contains it.
const detectCollisions: CollisionDetection = (args) => {
  const hits = pointerWithin(args)
  const rows = hits.filter((hit) => hit.id !== UNASSIGNED_KEY)
  return rows.length > 0 ? rows : hits
}

function pointerY({ activatorEvent, delta }: Pick<DragMoveEvent, 'activatorEvent' | 'delta'>): number {
  return (activatorEvent as PointerEvent).clientY + delta.y
}

// Drop zone that detaches whatever lands on it from every parent. Always
// rendered so there is somewhere to drop even when nothing is unassigned yet,
// but its label only shows when it holds something or a drag is under way.
function UnassignedZone({ count, children }: { count: number; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: UNASSIGNED_KEY })
  const { active } = useDndContext()
  return (
    <div ref={setNodeRef} className={classNames('hierarchy-unassigned', isOver && 'hierarchy-unassigned--over')}>
      {(count > 0 || active) && <div className="hierarchy-section_label">Unassigned</div>}
      {children}
    </div>
  )
}

function HierarchyRow({ node, depth, expanded, drop, onToggle, onMove }: {
  node: HierarchyNode
  depth: number
  expanded: Set<string>
  drop: DropState | null
  onToggle: (key: string) => void
  onMove: (key: string) => void
}) {
  const Icon = KIND_ICON[node.kind]
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.key)
  // Pointer drags only. The row isn't a keyboard target; Move is (see MoveDialog).
  const { listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: node.key, disabled: node.kind === 'milestone' })
  const { setNodeRef: setDropRef } = useDroppable({ id: node.key })
  const placement = drop?.key === node.key ? drop.placement : null

  return (
    <div className="hierarchy-node">
      <div
        ref={(el) => { setDragRef(el); setDropRef(el) }}
        className={classNames(
          'hierarchy-row',
          isDragging && 'hierarchy-row--dragging',
          placement === 'inside' && 'hierarchy-row--over',
          placement === 'before' && 'hierarchy-row--drop_before',
          placement === 'after' && 'hierarchy-row--drop_after',
        )}
        style={{ paddingLeft: `${depth * 20}px` }}
        {...listeners}
      >
        {hasChildren ? (
          <Button
            onClick={() => onToggle(node.key)}
            className="hierarchy-toggle"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
            aria-expanded={isOpen}
          >
            <ChevronRight className={classNames('hierarchy-chevron', isOpen && 'hierarchy-chevron--open')} />
          </Button>
        ) : (
          <span className="hierarchy-toggle_spacer" />
        )}
        <Icon className="hierarchy-icon" aria-hidden="true" />
        <span className="hierarchy-title" title={node.title}>{node.title}</span>
        <div className="hierarchy-progress">
          <ProgressBar percent={donePercent({ tasks_count: node.tasksCount, done_tasks_count: node.doneTasksCount })} />
        </div>
        <span className="hierarchy-count">{node.doneTasksCount}/{node.tasksCount}</span>
        {node.kind === 'milestone' ? (
          <span className="hierarchy-move_spacer" />
        ) : (
          <Button variant="ghost" className="hierarchy-move" aria-label={`Move ${node.title}`} title="Move" onClick={() => onMove(node.key)}>
            <Move className="hierarchy-move_icon" aria-hidden="true" />
          </Button>
        )}
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <HierarchyRow key={child.key} node={child} depth={depth + 1} expanded={expanded} drop={drop} onToggle={onToggle} onMove={onMove} />
      ))}
    </div>
  )
}

export default function HierarchyScreen() {
  usePageTitle('Hierarchy')
  const { data: milestones = [], isLoading: loadingMilestones } = useMilestones()
  const { data: initiatives = [], isLoading: loadingInitiatives } = useInitiatives()
  const { data: epics = [], isLoading: loadingEpics } = useEpics()
  const { data: tasks = [], isLoading: loadingTasks } = useTasks()
  const isLoading = loadingMilestones || loadingInitiatives || loadingEpics || loadingTasks

  const hierarchy = useMemo(
    () => buildHierarchy(milestones, initiatives, epics, tasks),
    [milestones, initiatives, epics, tasks],
  )
  const { tree, unassigned } = hierarchy

  const move = useMoveHierarchyItem()
  // A small distance threshold keeps clicks on the expand toggle from starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [drop, setDrop] = useState<DropState | null>(null)
  const [movingKey, setMovingKey] = useState<string | null>(null)
  const moving = movingKey ? findNode(hierarchy, movingKey) : null

  // What the pointer is doing to the row it is over: the top and bottom edges
  // of a sibling row order the item beside it, the middle nests it inside.
  function resolveDrop(event: DragMoveEvent | DragEndEvent) {
    if (!event.over) return null
    const dragged = findNode(hierarchy, String(event.active.id))
    if (!dragged) return null
    if (event.over.id === UNASSIGNED_KEY) return { dragged, over: null, placement: 'inside' as const }
    const over = findNode(hierarchy, String(event.over.id))
    if (!over) return null
    const placement = dropPlacement(pointerY(event) - event.over.rect.top, event.over.rect.height, dropOptions(dragged, over))
    return placement && { dragged, over, placement }
  }

  function handleDragMove(event: DragMoveEvent) {
    const target = resolveDrop(event)
    const next = target?.over ? { key: target.over.key, placement: target.placement } : null
    setDrop((prev) => (prev?.key === next?.key && prev?.placement === next?.placement ? prev : next))
  }

  function handleDragEnd(event: DragEndEvent) {
    setDrop(null)
    const target = resolveDrop(event)
    const plan = target && planDrop(hierarchy, target.dragged, target.over, target.placement)
    if (plan) move.mutate(plan)
  }

  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <WorkspaceLayout>
      <div className="view-hierarchy">
        <div className="hierarchy-header">
          <h1 className="hierarchy-heading">Hierarchy</h1>
        </div>
        <div className="hierarchy-body">
          <DndContext
            sensors={sensors}
            collisionDetection={detectCollisions}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setDrop(null)}
          >
          <div className="hierarchy-tree">
            {isLoading && (
              <div className="hierarchy-loading">
                <Loader2 className="hierarchy-spinner" aria-label="Loading" />
              </div>
            )}

            {!isLoading && tree.length === 0 && unassigned.length === 0 && (
              <p className="hierarchy-empty">Nothing here yet.</p>
            )}

            {!isLoading && tree.map((node) => (
              <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} drop={drop} onToggle={toggle} onMove={setMovingKey} />
            ))}

            {!isLoading && (
              <UnassignedZone count={unassigned.length}>
                {unassigned.map((node) => (
                  <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} drop={drop} onToggle={toggle} onMove={setMovingKey} />
                ))}
              </UnassignedZone>
            )}
          </div>
          </DndContext>
        </div>
        {moving && (
          <MoveDialog
            key={moving.key}
            hierarchy={hierarchy}
            node={moving}
            onMove={(plan) => move.mutate(plan)}
            onClose={() => setMovingKey(null)}
          />
        )}
      </div>
    </WorkspaceLayout>
  )
}
