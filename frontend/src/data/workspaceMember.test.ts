import type { TeamOnlyMember, WorkspaceMember, WorkspacePerson } from '@/types'
import { directMembers, isTeamOnly, personLabel, viaTeamsLabel } from './workspaceMember'

const user = (id: number, name: string) => ({ id, name, email: `${name.toLowerCase()}@example.com` })
const direct = (id: number, name: string): WorkspaceMember =>
  ({ id: id + 100, role: 'member', user_id: id, weekly_capacity_hours: 40, user: user(id, name) })
const teamOnly = (id: number, name: string, ...teams: string[]): TeamOnlyMember =>
  ({ id: null, role: 'member', user_id: id, weekly_capacity_hours: 0, user: user(id, name), teams: teams.map((t, i) => ({ id: i + 1, name: t })) })

describe('team-only people', () => {
  const people: WorkspacePerson[] = [direct(1, 'Ada'), teamOnly(2, 'Bo', 'Design'), direct(3, 'Cy')]

  test('a person with no membership id is team-only', () => {
    expect(people.map(isTeamOnly)).toEqual([false, true, false])
  })

  test('direct members are the ones with a membership, in the order given', () => {
    expect(directMembers(people).map((m) => m.user.name)).toEqual(['Ada', 'Cy'])
    expect(directMembers([teamOnly(2, 'Bo', 'Design')])).toEqual([])
  })

  test('the label names every team that gives the access', () => {
    expect(viaTeamsLabel(teamOnly(2, 'Bo', 'Design'))).toBe('via Design')
    expect(viaTeamsLabel(teamOnly(2, 'Bo', 'Design', 'Writers'))).toBe('via Design, Writers')
  })

  test('a picker names a team-only person with their teams and anyone else by name', () => {
    expect(personLabel(direct(1, 'Ada'))).toBe('Ada')
    expect(personLabel(teamOnly(2, 'Bo', 'Design', 'Writers'))).toBe('Bo (via Design, Writers)')
  })
})
