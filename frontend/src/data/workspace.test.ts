import type { WorkspaceSummary } from '@/types'
import { canManageWorkspace, canWriteWorkspace, transferTargets } from './workspace'

const space = (id: number, role: WorkspaceSummary['role'], personal = false): WorkspaceSummary =>
  ({ id, name: `Space ${id}`, personal, role })

test('only members and above can add content, only admins and owners manage', () => {
  expect([canWriteWorkspace('viewer'), canWriteWorkspace('member'), canWriteWorkspace(null)]).toEqual([false, true, false])
  expect([canManageWorkspace('member'), canManageWorkspace('admin'), canManageWorkspace('owner')]).toEqual([false, true, true])
})

test('transferTargets are the other Spaces the user can write in', () => {
  const spaces = [space(1, 'owner', true), space(2, 'viewer'), space(3, 'member'), space(4, 'admin'), space(5, null)]
  expect(transferTargets(spaces, 1).map((s) => s.id)).toEqual([3, 4])
  expect(transferTargets(spaces, undefined).map((s) => s.id)).toEqual([1, 3, 4])
  expect(transferTargets([], 1)).toEqual([])
})
