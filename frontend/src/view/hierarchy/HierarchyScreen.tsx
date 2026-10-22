import { useMemo, useState, type ComponentType } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { DndContext, PointerSensor, useDndContext, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { ChevronRight, Milestone as MilestoneIcon, Flag, Target, CheckSquare, Loader2 } from 'lucide-react'
import { classNames } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { ProgressBar } from '@/components/Timeline'
import { donePercent } from '@/data/schedule'
import { buildHierarchy, reparentChanges, type HierarchyNode, type HierarchyKind } from '@/data/hierarchy'
import { useMilestones } from '@/api/milestones'
import { useInitiatives, useUpdateInitiative } from '@/api/initiatives'
import { useEpics, useUpdateEpic } from '@/api/epics'
import { useTasks, useUpdateTask } from '@/api/tasks'
import { usePageTitle } from '@/hooks/usePageTitle'
import './HierarchyScreen.scss'

const KIND_ICON: Record<HierarchyKind, ComponentType<{ className?: string }>> = {
  milestone: MilestoneIcon,
  initiative: Flag,
  epic: Target,
  task: CheckSquare,
}

// Drop zone that detaches whatever lands on it from every parent. Always
// rendered so there is somewhere to drop even when nothing is unassigned yet,
// but its label only shows when it holds something or a drag is under way.
function UnassignedZone({ count, children }: { count: number; children?: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'unassigned' })
  const { active } = useDndContext()
  return (
    <div ref={setNodeRef} className={classNames('hierarchy-unassigned', isOver && 'hierarchy-unassigned--over')}>
      {(count > 0 || active) && <div className="hierarchy-section_label">Unassigned</div>}
      {children}
    </div>
  )
}

function HierarchyRow({ node, depth, expanded, onToggle }: {
  node: HierarchyNode
  depth: number
  expanded: Set<string>
  onToggle: (key: string) => void
}) {
  const Icon = KIND_ICON[node.kind]
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.key)
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({ id: node.key, data: { node }, disabled: node.kind === 'milestone' })
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: node.key, data: { node } })

  return (
    <div className="hierarchy-node">
      <div
        ref={(el) => { setDragRef(el); setDropRef(el) }}
        className={classNames('hierarchy-row', isDragging && 'hierarchy-row--dragging', isOver && !isDragging && 'hierarchy-row--over')}
        style={{ paddingLeft: `${depth * 20}px` }}
        {...attributes}
        {...listeners}
      >
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.key)}
            className="hierarchy-toggle"
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            <ChevronRight className={classNames('hierarchy-chevron', isOpen && 'hierarchy-chevron--open')} />
          </button>
        ) : (
          <span className="hierarchy-toggle_spacer" />
        )}
        <Icon className="hierarchy-icon" aria-hidden="true" />
        <span className="hierarchy-title" title={node.title}>{node.title}</span>
        <div className="hierarchy-progress">
          <ProgressBar percent={donePercent({ tasks_count: node.tasksCount, done_tasks_count: node.doneTasksCount })} />
        </div>
        <span className="hierarchy-count">{node.doneTasksCount}/{node.tasksCount}</span>
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <HierarchyRow key={child.key} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
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

  const { tree, unassigned } = useMemo(
    () => buildHierarchy(milestones, initiatives, epics, tasks),
    [milestones, initiatives, epics, tasks],
  )

  const qc = useQueryClient()
  const updateInitiative = useUpdateInitiative()
  const updateEpic = useUpdateEpic()
  const updateTask = useUpdateTask()
  // A small distance threshold keeps clicks on the expand toggle from starting a drag.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  function handleDragEnd({ active, over }: DragEndEvent) {
    if (!over) return
    const dragged = active.data.current?.node as HierarchyNode
    const target = over.id === 'unassigned' ? null : (over.data.current?.node as HierarchyNode)
    const move = reparentChanges(dragged, target)
    if (!move) return
    const request =
      move.kind === 'initiative' ? updateInitiative.mutateAsync({ id: move.id, ...move.changes })
      : move.kind === 'epic' ? updateEpic.mutateAsync({ id: move.id, ...move.changes })
      : updateTask.mutateAsync({ id: move.id, ...move.changes })
    // Rollups at every level shift when something moves, not just the level that was edited.
    request.finally(() => {
      for (const key of ['milestones', 'initiatives', 'epics', 'tasks']) qc.invalidateQueries({ queryKey: [key] })
    })
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
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
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
              <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} onToggle={toggle} />
            ))}

            {!isLoading && (
              <UnassignedZone count={unassigned.length}>
                {unassigned.map((node) => (
                  <HierarchyRow key={node.key} node={node} depth={0} expanded={expanded} onToggle={toggle} />
                ))}
              </UnassignedZone>
            )}
          </div>
          </DndContext>
        </div>
      </div>
    </WorkspaceLayout>
  )
}
