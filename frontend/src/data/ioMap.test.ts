import { buildIoTree, linkChange, linkValue } from './ioMap'
import type { IoNode } from '@/types'

const node = (id: number, parent_id: number | null, kind: IoNode['kind'], position = 0): IoNode =>
  ({ id, parent_id, kind, title: `N${id}`, description: null, position, objective_id: null, initiative_id: null, progress: null })

test('builds goal, factors and conditions in position order', () => {
  const tree = buildIoTree([node(3, 1, 'csf', 2), node(1, null, 'goal'), node(2, 1, 'csf', 1), node(4, 2, 'nc')])
  expect(tree).toHaveLength(1)
  expect(tree[0].children.map((c) => c.node.id)).toEqual([2, 3])
  expect(tree[0].children[0].children.map((c) => c.node.id)).toEqual([4])
})

test('an empty map has no tree', () => {
  expect(buildIoTree([])).toEqual([])
})

test('link values round-trip for objectives, initiatives and none', () => {
  expect(linkValue({ objective_id: 3, initiative_id: null })).toBe('o:3')
  expect(linkValue({ objective_id: null, initiative_id: 5 })).toBe('i:5')
  expect(linkValue({ objective_id: null, initiative_id: null })).toBe('')
  expect(linkChange('o:3')).toEqual({ objective_id: 3, initiative_id: null })
  expect(linkChange('i:5')).toEqual({ objective_id: null, initiative_id: 5 })
  expect(linkChange('')).toEqual({ objective_id: null, initiative_id: null })
})
