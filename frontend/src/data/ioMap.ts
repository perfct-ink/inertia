import type { IoNode, IoNodeKind } from '@/types'

export const IO_KIND_LABEL: Record<IoNodeKind, string> = {
  goal: 'Goal',
  csf: 'Critical success factor',
  nc: 'Necessary condition',
}

// What a node's children are called, or null when it has none (a necessary condition).
export const IO_CHILD_LABEL: Record<IoNodeKind, string | null> = {
  goal: 'critical success factor',
  csf: 'necessary condition',
  nc: null,
}

export interface IoTreeNode { node: IoNode; children: IoTreeNode[] }

// The map as a tree: the goal, each of its factors, and their conditions, in position order.
export function buildIoTree(nodes: IoNode[]): IoTreeNode[] {
  const byParent = new Map<number | null, IoNode[]>()
  nodes.forEach((n) => byParent.set(n.parent_id, [...(byParent.get(n.parent_id) ?? []), n]))
  const build = (parentId: number | null): IoTreeNode[] =>
    (byParent.get(parentId) ?? [])
      .sort((a, b) => a.position - b.position || a.id - b.id)
      .map((node) => ({ node, children: build(node.id) }))
  return build(null)
}

// "o:3" / "i:5" / "" for the link picker, and back.
export function linkValue(node: Pick<IoNode, 'objective_id' | 'initiative_id'>): string {
  return node.objective_id ? `o:${node.objective_id}` : node.initiative_id ? `i:${node.initiative_id}` : ''
}

export function linkChange(value: string): { objective_id: number | null; initiative_id: number | null } {
  const [kind, id] = value.split(':')
  return { objective_id: kind === 'o' ? Number(id) : null, initiative_id: kind === 'i' ? Number(id) : null }
}
