import { FOLDER_CHANGED, initialsOf, otherPeople, presenceField } from './presence'

describe('otherPeople', () => {
  const state = (id: number, name: string, color?: string) => ({ user: { id, name, color } })

  it('lists the other people by name, each once, whatever number of tabs they have open', () => {
    const states = [state(3, 'Sam', 'red'), state(2, 'alex'), state(3, 'Sam', 'red'), state(4, 'Bo')]
    expect(otherPeople(states, 1).map((p) => p.name)).toEqual(['alex', 'Bo', 'Sam'])
  })

  it('leaves out the signed-in user, including their other tabs', () => {
    expect(otherPeople([state(1, 'Me'), state(1, 'Me'), state(2, 'Sam')], 1).map((p) => p.id)).toEqual([2])
  })

  it('ignores states that are not a person (nothing set yet, a bad shape)', () => {
    const states = [{}, { user: null }, { user: { id: 'x', name: 'Bad' } }, { user: { id: 5 } }, state(2, 'Sam')]
    expect(otherPeople(states as Record<string, unknown>[], 1).map((p) => p.id)).toEqual([2])
  })

  it('gives a person without a colour their own steady one', () => {
    const [person] = otherPeople([state(7, 'Kit')], 1)
    expect(person.color).toBe(presenceField({ id: 7, name: 'Kit' }).color)
  })
})

describe('initialsOf', () => {
  it('takes up to two initials', () => {
    expect(initialsOf('sam lee')).toBe('SL')
    expect(initialsOf('Ada Byron King')).toBe('AB')
    expect(initialsOf('  Bo ')).toBe('B')
    expect(initialsOf('')).toBe('?')
  })
})

describe('FOLDER_CHANGED', () => {
  it('is the word the collab server sends', () => {
    expect(FOLDER_CHANGED).toBe('changed')
  })
})
