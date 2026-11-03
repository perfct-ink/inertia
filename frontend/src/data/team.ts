import type { WorkspaceRole } from '@/types'

// Teams: groups of people that hold one role in a Space together. Mirrors the
// Team model and TeamBlueprint on the server.

// A team is never an owner (Team::ROLES): ownership stays with named people.
export type TeamRole = Exclude<WorkspaceRole, 'owner'>

// Least to most privileged, the same order as the Space roles.
export const TEAM_ROLES: TeamRole[] = ['viewer', 'member', 'admin']

export const TEAM_ROLE_HELP: Record<TeamRole, string> = {
  viewer: 'Can read everything in the Space.',
  member: 'Can also create, edit and delete content.',
  admin: 'Can also rename the Space and manage its people and teams.',
}

export interface TeamMember {
  // The team membership, which is what removing a person from the team deletes.
  id: number
  user_id: number
  user: { id: number; name: string; email: string }
}

export interface Team {
  id: number
  workspace_id: number
  name: string
  role: TeamRole
  members: TeamMember[]
}

// Collapses runs of spaces the way the server does (Team normalizes :name).
export function normalizeTeamName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

// Teams by name, ignoring case.
export function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
}

// Whether the Space already has a team with this name (names are unique per
// Space, ignoring case and extra spaces).
export function teamNameTaken(teams: Team[], name: string): boolean {
  const wanted = normalizeTeamName(name).toLowerCase()
  return wanted !== '' && teams.some((team) => team.name.toLowerCase() === wanted)
}

export function teamPeopleLabel(team: Pick<Team, 'members'>): string {
  const count = team.members.length
  if (count === 0) return 'No one yet'
  return count === 1 ? '1 person' : `${count} people`
}

// The signed-in user's own place on a team (their team membership), if any.
export function ownTeamMembership(team: Pick<Team, 'members'>, userId: number | undefined): TeamMember | undefined {
  return userId === undefined ? undefined : team.members.find((m) => m.user_id === userId)
}

// Whether leaving `team` takes the whole Space away from the user: it is the
// only way in when they have no membership of their own and are on no other team.
export function leavingEndsAccess(teams: Team[], team: Team, userId: number, hasOwnMembership: boolean): boolean {
  if (hasOwnMembership) return false
  return !teams.some((other) => other.id !== team.id && ownTeamMembership(other, userId))
}
