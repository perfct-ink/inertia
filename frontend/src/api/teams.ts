import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Team, TeamRole } from '@/data/team'

// Teams in a Space: groups of people that hold one role there together. The
// Space is named in the path, like its members (api/workspaces.ts).
const teamsPath = (workspaceId: number) => `/api/v1/workspaces/${workspaceId}/teams`
const teamMemberPath = (workspaceId: number, teamId: number, membershipId: number) => `${teamsPath(workspaceId)}/${teamId}/members/${membershipId}`

// `enabled` lets a closed dialog skip the request until it is opened.
export function useTeams(workspaceId: number, enabled = true) {
  return useQuery<Team[]>({
    queryKey: ['teams', workspaceId],
    queryFn: () => api.get(teamsPath(workspaceId)).then((r) => r.data),
    enabled: enabled && !!workspaceId,
  })
}

// Changing a team can raise or lower the signed-in user's own role.
function useRefreshTeams(workspaceId: number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['teams', workspaceId] })
    qc.invalidateQueries({ queryKey: ['workspaces'] })
    qc.invalidateQueries({ queryKey: ['workspace'] })
  }
}

function useTeamMutation<T>(workspaceId: number, request: (vars: T) => Promise<unknown>) {
  return useMutation({ mutationFn: request, onSuccess: useRefreshTeams(workspaceId) })
}

export function useCreateTeam(workspaceId: number) {
  return useTeamMutation(workspaceId, ({ name, role }: { name: string; role: TeamRole }) =>
    api.post(teamsPath(workspaceId), { team: { name, role } }))
}

export function useUpdateTeam(workspaceId: number) {
  return useTeamMutation(workspaceId, ({ id, ...team }: { id: number; name?: string; role?: TeamRole }) =>
    api.patch(`${teamsPath(workspaceId)}/${id}`, { team }))
}

export function useDeleteTeam(workspaceId: number) {
  return useTeamMutation(workspaceId, (id: number) => api.delete(`${teamsPath(workspaceId)}/${id}`))
}

export function useAddTeamMember(workspaceId: number) {
  return useTeamMutation(workspaceId, ({ teamId, email }: { teamId: number; email: string }) =>
    api.post(`${teamsPath(workspaceId)}/${teamId}/members`, { email }))
}

export function useRemoveTeamMember(workspaceId: number) {
  return useTeamMutation(workspaceId, ({ teamId, membershipId }: { teamId: number; membershipId: number }) =>
    api.delete(teamMemberPath(workspaceId, teamId, membershipId)))
}

// The signed-in user takes themselves off a team. When that was their only way
// into the Space (`endsAccess`), nothing in it may be refetched: those requests
// would be 404s. The caller switches to another Space instead, which drops the cache.
export function useLeaveTeam(workspaceId: number) {
  const refresh = useRefreshTeams(workspaceId)
  return useMutation({
    mutationFn: ({ teamId, membershipId }: { teamId: number; membershipId: number; endsAccess: boolean }) =>
      api.delete(teamMemberPath(workspaceId, teamId, membershipId)),
    onSuccess: (_data, { endsAccess }) => { if (!endsAccess) refresh() },
  })
}
