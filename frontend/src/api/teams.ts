import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { Team, TeamRole } from '@/data/team'

// Teams in a Space: groups of people that hold one role there together. The
// Space is named in the path, like its members (api/workspaces.ts).
const teamsPath = (workspaceId: number) => `/api/v1/workspaces/${workspaceId}/teams`

// `enabled` lets a closed dialog skip the request until it is opened.
export function useTeams(workspaceId: number, enabled = true) {
  return useQuery<Team[]>({
    queryKey: ['teams', workspaceId],
    queryFn: () => api.get(teamsPath(workspaceId)).then((r) => r.data),
    enabled: enabled && !!workspaceId,
  })
}

function useTeamMutation<T>(workspaceId: number, request: (vars: T) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams', workspaceId] })
      // People who are only on a team are listed with the Space's members.
      qc.invalidateQueries({ queryKey: ['workspace-members', workspaceId] })
      // Changing a team can raise or lower the signed-in user's own role.
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
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
    api.delete(`${teamsPath(workspaceId)}/${teamId}/members/${membershipId}`))
}
