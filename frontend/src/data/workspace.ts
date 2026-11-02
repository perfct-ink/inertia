import type { WorkspaceRole, WorkspaceSummary } from '@/types'

// Order matters: a role can do everything the roles before it can.
export const WORKSPACE_ROLES: WorkspaceRole[] = ['viewer', 'member', 'admin', 'owner']

export const canManageWorkspace = (role: WorkspaceRole | null | undefined) => role === 'admin' || role === 'owner'
export const canWriteWorkspace = (role: WorkspaceRole | null | undefined) => !!role && role !== 'viewer'

// The Spaces something can be moved or copied into from the current one:
// every other Space where the user can add content.
export function transferTargets(spaces: WorkspaceSummary[], currentId: number | undefined): WorkspaceSummary[] {
  return spaces.filter((space) => space.id !== currentId && canWriteWorkspace(space.role))
}
