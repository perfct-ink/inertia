import { useMemo, useState, type FormEvent } from 'react'
import { Button, Modal, Select } from '@/components/ui'
import {
  END_OF_LIST, KIND_LABEL, currentPlace, moveDestinations, moveSlots, planMove,
  type Hierarchy, type HierarchyNode, type MovePlan,
} from '@/data/hierarchy'

// Moves one item without dragging: pick its new parent, then its place among
// that parent's items. This is the keyboard, screen reader and touch way to do
// what a drag does, and it makes the same move (data/hierarchy.ts planMove).
export default function MoveDialog({ hierarchy, node, onMove, onClose }: {
  hierarchy: Hierarchy
  node: HierarchyNode
  onMove: (plan: MovePlan) => void
  onClose: () => void
}) {
  const place = useMemo(() => currentPlace(hierarchy, node), [hierarchy, node])
  const destinations = useMemo(() => moveDestinations(hierarchy, node), [hierarchy, node])
  const [destinationKey, setDestinationKey] = useState(place.destination)
  const [index, setIndex] = useState(place.index)

  // Unassigned is always the last destination, so it is the fallback.
  const destination = destinations.find((d) => d.key === destinationKey) ?? destinations[destinations.length - 1]
  const slots = moveSlots(hierarchy, node, destination.parent)
  const slotIndex = Math.min(index, slots.length - 1)
  const plan = planMove(hierarchy, node, destination.parent, slotIndex)

  function chooseDestination(key: string) {
    setDestinationKey(key)
    // Under the same parent the item keeps its place; under a new one it goes last.
    setIndex(key === place.destination ? place.index : END_OF_LIST)
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (plan) onMove(plan)
    onClose()
  }

  return (
    <Modal open title={`Move "${node.title}"`} description={`Choose a new parent for this ${KIND_LABEL[node.kind].toLowerCase()} and its place among that parent's items.`} onClose={onClose}>
      <form onSubmit={submit} className="ui-modal-form">
        <label className="hierarchy-move_field">
          <span>Move to</span>
          <Select value={destination.key} onChange={(e) => chooseDestination(e.target.value)}>
            {destinations.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
          </Select>
        </label>
        <label className="hierarchy-move_field">
          <span>Place</span>
          <Select value={String(slotIndex)} onChange={(e) => setIndex(Number(e.target.value))}>
            {slots.map((slot) => <option key={slot.index} value={slot.index}>{slot.label}</option>)}
          </Select>
        </label>
        <div className="ui-modal-actions">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!plan}>Move</Button>
        </div>
      </form>
    </Modal>
  )
}
