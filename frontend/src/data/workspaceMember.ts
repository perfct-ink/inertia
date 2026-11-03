import type { TeamOnlyMember, WorkspaceMember, WorkspacePerson } from '@/types'

// The people a Space lists: its members, then those who are in only through
// teams (see TeamOnlyMember). Mirrors WorkspaceMembersController#index.

// True for someone with no membership of their own.
export function isTeamOnly(person: WorkspacePerson): person is TeamOnlyMember {
  return person.id === null
}

// The people with a membership, which is what a role, a weekly capacity or a
// project allocation belongs to.
export function directMembers(people: WorkspacePerson[]): WorkspaceMember[] {
  return people.filter((person): person is WorkspaceMember => !isTeamOnly(person))
}

// The teams that give a team-only person their access, for a "via ..." label.
export function viaTeamsLabel(person: TeamOnlyMember): string {
  return `via ${person.teams.map((team) => team.name).join(', ')}`
}

// How a picker names someone: their name, and for a team-only person the
// teams that give them access ("Cy (via Design)").
export function personLabel(person: WorkspacePerson): string {
  return isTeamOnly(person) ? `${person.user.name} (${viaTeamsLabel(person)})` : person.user.name
}
