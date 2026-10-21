import { inviteLink } from './invitation'

test('inviteLink points at the invite route and escapes the token', () => {
  expect(inviteLink('https://inertia.it.com', 'abc123')).toBe('https://inertia.it.com/index.html#/invite/abc123')
  expect(inviteLink('http://localhost:3000', 'a/b c')).toBe('http://localhost:3000/index.html#/invite/a%2Fb%20c')
})
