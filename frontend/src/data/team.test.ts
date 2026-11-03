import { TEAM_ROLES, TEAM_ROLE_HELP, leavingEndsAccess, normalizeTeamName, ownTeamMembership, sortTeams, teamNameTaken, teamPeopleLabel, type Team } from './team'

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

test('finds the signed-in user on a team, and nothing without a user', () => {
  const design = team(1, 'Design', 2)
  expect(ownTeamMembership(design, 2)?.id).toBe(101)
  expect(ownTeamMembership(design, 9)).toBeUndefined()
  expect(ownTeamMembership(design, undefined)).toBeUndefined()
})

test('leaving the only team ends access to the Space unless the user has their own membership', () => {
  const design = team(1, 'Design', 2)
  const writers = team(2, 'Writers', 0)
  expect(leavingEndsAccess([design, writers], design, 1, false)).toBe(true)
  expect(leavingEndsAccess([design, writers], design, 1, true)).toBe(false)
})

test('leaving one of several teams keeps access through the others', () => {
  const design = team(1, 'Design', 2)
  const writers = team(2, 'Writers', 1)
  expect(leavingEndsAccess([design, writers], design, 1, false)).toBe(false)
  // Someone only on Design (user 2) still loses everything when they leave it.
  expect(leavingEndsAccess([design, writers], design, 2, false)).toBe(true)
})
