import { initials, toggleId } from './person'

test('initials uses the first and last name', () => {
  expect(initials('Ada Lovelace')).toBe('AL')
  expect(initials('  grace  brewster  murray hopper ')).toBe('GH')
  expect(initials('Cher')).toBe('C')
  expect(initials('   ')).toBe('?')
})

test('toggleId adds a missing id and removes a present one without mutating', () => {
  const ids = [1, 2]
  expect(toggleId(ids, 3)).toEqual([1, 2, 3])
  expect(toggleId(ids, 1)).toEqual([2])
  expect(ids).toEqual([1, 2])
})
