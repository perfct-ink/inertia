import { TEAM_ROLES, TEAM_ROLE_HELP, normalizeTeamName, sortTeams, teamNameTaken, teamPeopleLabel, type Team } from './team'

const team = (id: number, name: string, memberCount = 0): Team => ({
  id,
  workspace_id: 1,
  name,
  role: 'member',
  members: Array.from({ length: memberCount }, (_, i) => ({
    id: id * 100 + i,
    user_id: i + 1,
    user: { id: i + 1, name: `Person ${i + 1}`, email: `person${i + 1}@example.com` },
  })),
})

test('a team can be a viewer, member or admin but never an owner', () => {
  expect(TEAM_ROLES).toEqual(['viewer', 'member', 'admin'])
  expect(Object.keys(TEAM_ROLE_HELP)).toEqual(TEAM_ROLES)
})

test('team names collapse extra spaces', () => {
  expect(normalizeTeamName('  Product   design ')).toBe('Product design')
})

test('teams sort by name ignoring case without changing the original list', () => {
  const teams = [team(1, 'writers'), team(2, 'Design'), team(3, 'Engineering')]
  expect(sortTeams(teams).map((t) => t.name)).toEqual(['Design', 'Engineering', 'writers'])
  expect(teams.map((t) => t.name)).toEqual(['writers', 'Design', 'Engineering'])
})

test('a name is taken when another team has it, ignoring case and spacing', () => {
  const teams = [team(1, 'Design'), team(2, 'Product design')]
  expect(teamNameTaken(teams, ' design ')).toBe(true)
  expect(teamNameTaken(teams, 'Product   Design')).toBe(true)
  expect(teamNameTaken(teams, 'Writers')).toBe(false)
  expect(teamNameTaken(teams, '   ')).toBe(false)
})

test('the people count reads naturally', () => {
  expect(teamPeopleLabel(team(1, 'Design'))).toBe('No one yet')
  expect(teamPeopleLabel(team(1, 'Design', 1))).toBe('1 person')
  expect(teamPeopleLabel(team(1, 'Design', 3))).toBe('3 people')
})
