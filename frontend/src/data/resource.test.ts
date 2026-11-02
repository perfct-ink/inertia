import type { ResourceAllocation, WorkspaceMember } from '@/types'
import {
  allocationError, allocationPeriod, currentAllocations, formatHours, HOURS_ERROR, isActiveInWeek, loadPercent,
  overAllocated, parseHours, personLoads, projectLoads, weekEnd, weekNote, weekRange, weekStart,
} from './resource'

const member = (userId: number, name: string, capacity = 40) =>
  ({ id: userId + 100, user_id: userId, role: 'member', weekly_capacity_hours: capacity, user: { id: userId, name, email: `${name}@example.com` } }) as WorkspaceMember
const alloc = (id: number, userId: number, folderId: number, hours: number, start: string | null = null, end: string | null = null) =>
  ({ id, user_id: userId, folder_id: folderId, hours_per_week: hours, start_date: start, end_date: end }) as ResourceAllocation

// 2026-11-02 is a Monday.
const weeks = weekRange('2026-11-04', 3)

describe('weeks', () => {
  test('a week runs Monday to Sunday and is named by its Monday', () => {
    expect(weekStart('2026-11-01')).toBe('2026-10-26')
    expect(weekStart('2026-11-02')).toBe('2026-11-02')
    expect(weekStart('2026-11-04')).toBe('2026-11-02')
    expect(weekEnd('2026-11-02')).toBe('2026-11-08')
  })

  test('a range counts weeks from the week of a date, moved by an offset', () => {
    expect(weeks).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
    expect(weekRange('2026-11-04', 2, 4)).toEqual(['2026-11-30', '2026-12-07'])
    expect(weekRange('2026-11-04', 2, -1)).toEqual(['2026-10-26', '2026-11-02'])
  })
})

describe('isActiveInWeek', () => {
  const week = '2026-11-02'
  test('an allocation without dates is always active', () => {
    expect(isActiveInWeek({ start_date: null, end_date: null }, week)).toBe(true)
  })

  test('touching any day of the week counts for the whole week', () => {
    expect(isActiveInWeek({ start_date: '2026-11-08', end_date: null }, week)).toBe(true)
    expect(isActiveInWeek({ start_date: null, end_date: '2026-11-02' }, week)).toBe(true)
  })

  test('starting after the week or ending before it is not active', () => {
    expect(isActiveInWeek({ start_date: '2026-11-09', end_date: null }, week)).toBe(false)
    expect(isActiveInWeek({ start_date: null, end_date: '2026-11-01' }, week)).toBe(false)
  })
})

describe('personLoads', () => {
  const members = [member(2, 'Ben', 20), member(1, 'Ada')]

  test('adds a person\'s hours across projects per week and compares them with capacity', () => {
    const loads = personLoads(members, [alloc(1, 1, 10, 30), alloc(2, 1, 11, 20, '2026-11-09')], weeks)
    expect(loads.map((l) => l.name)).toEqual(['Ada', 'Ben'])

    const [ada, ben] = loads
    expect(ada.capacity).toBe(40)
    expect(ada.weeks.map((w) => w.allocated)).toEqual([30, 50, 50])
    expect(ada.weeks.map((w) => w.free)).toEqual([10, -10, -10])
    expect(ada.weeks.map((w) => w.over)).toEqual([0, 10, 10])
    expect(ada.weeks[1].byProject).toEqual({ 10: 30, 11: 20 })
    expect(ada.overWeeks).toBe(2)

    expect(ben.weeks.map((w) => w.allocated)).toEqual([0, 0, 0])
    expect(ben.weeks.map((w) => w.free)).toEqual([20, 20, 20])
    expect(ben.overWeeks).toBe(0)
  })

  test('two allocations to one project add up, and decimals do not drift', () => {
    const [ada] = personLoads([member(1, 'Ada')], [alloc(1, 1, 10, 0.1), alloc(2, 1, 10, 0.2)], weeks)
    expect(ada.weeks[0].byProject).toEqual({ 10: 0.3 })
    expect(ada.weeks[0].allocated).toBe(0.3)
  })

  test('someone with no capacity is over capacity by every hour allocated', () => {
    const [leave] = personLoads([member(1, 'Ada', 0)], [alloc(1, 1, 10, 8)], weeks)
    expect(leave.weeks[0].over).toBe(8)
  })

  test('lists allocations that have not finished before the first week, earliest start first', () => {
    const [ada] = personLoads([member(1, 'Ada')], [
      alloc(1, 1, 10, 5, '2026-12-01'),
      alloc(2, 1, 11, 5, null, '2026-10-30'),
      alloc(3, 1, 12, 5, '2026-11-02', '2026-11-13'),
      alloc(4, 1, 13, 5),
      alloc(5, 2, 10, 5),
    ], weeks)
    expect(ada.allocations.map((a) => a.id)).toEqual([4, 3, 1])
  })

  test('overAllocated keeps only the people over capacity in a visible week', () => {
    const loads = personLoads(members, [alloc(1, 1, 10, 45)], weeks)
    expect(overAllocated(loads).map((l) => l.name)).toEqual(['Ada'])
    expect(overAllocated(personLoads(members, [], weeks))).toEqual([])
  })
})

describe('projectLoads', () => {
  test('totals hours and counts people per week for each project with current allocations', () => {
    const loads = projectLoads([
      alloc(1, 1, 10, 10),
      alloc(2, 2, 10, 15, '2026-11-09'),
      alloc(3, 2, 10, 5, '2026-11-09'),
      alloc(4, 1, 11, 8, null, '2026-10-30'),
    ], weeks)
    expect(loads.map((l) => l.folderId)).toEqual([10])
    expect(loads[0].weeks).toEqual([
      { week: '2026-11-02', hours: 10, people: 1 },
      { week: '2026-11-09', hours: 30, people: 2 },
      { week: '2026-11-16', hours: 30, people: 2 },
    ])
    expect(loads[0].allocations.map((a) => a.id)).toEqual([1, 2, 3])
  })
})

test('currentAllocations drops only the ones that finished before the first week', () => {
  const list = [alloc(1, 1, 10, 5, null, '2026-11-01'), alloc(2, 1, 10, 5, null, '2026-11-02'), alloc(3, 1, 10, 5)]
  expect(currentAllocations(list, '2026-11-02').map((a) => a.id)).toEqual([2, 3])
})

test('loadPercent is the share of capacity, and 100 when there is none to share', () => {
  expect(loadPercent(30, 40)).toBe(75)
  expect(loadPercent(50, 40)).toBe(125)
  expect(loadPercent(5, 0)).toBe(100)
  expect(loadPercent(0, 0)).toBe(0)
})

test('weekNote says how far over, how much is free, or that the week is full', () => {
  const [ada] = personLoads([member(1, 'Ada'), member(2, 'Ben', 0)], [alloc(1, 1, 10, 30), alloc(2, 1, 11, 10, '2026-11-09'), alloc(3, 1, 11, 5, '2026-11-16')], weeks)
  expect(ada.weeks.map(weekNote)).toEqual(['10 h free', 'Full', 'Over by 5 h'])
  const [, ben] = personLoads([member(1, 'Ada'), member(2, 'Ben', 0)], [], weeks)
  expect(weekNote(ben.weeks[0])).toBe('No capacity')
})

describe('allocationError', () => {
  const form = { folderId: '10', hours: '12', start: '2026-11-02', end: '' }

  test('a complete form can be sent', () => {
    expect(allocationError(form)).toBe(null)
    expect(allocationError({ ...form, end: '2026-11-02' })).toBe(null)
  })

  test('says what is missing or wrong', () => {
    expect(allocationError({ ...form, folderId: '' })).toBe('Choose a project.')
    expect(allocationError({ ...form, hours: '0' })).toBe(HOURS_ERROR)
    expect(allocationError({ ...form, hours: '' })).toBe(HOURS_ERROR)
    expect(allocationError({ ...form, end: '2026-11-01' })).toBe("The end date can't be before the start date.")
  })
})

test('allocationPeriod says when an allocation runs', () => {
  expect(allocationPeriod({ start_date: '2026-11-02', end_date: '2026-12-04' })).toBe('Nov 2, 2026 to Dec 4, 2026')
  expect(allocationPeriod({ start_date: '2026-11-02', end_date: null })).toBe('From Nov 2, 2026, ongoing')
  expect(allocationPeriod({ start_date: null, end_date: '2026-12-04' })).toBe('Until Dec 4, 2026')
  expect(allocationPeriod({ start_date: null, end_date: null })).toBe('Ongoing')
})

test('hours are shown without trailing zeros', () => {
  expect(formatHours(12.5)).toBe('12.5')
  expect(formatHours(40)).toBe('40')
  expect(formatHours(7.333)).toBe('7.33')
})

describe('parseHours', () => {
  test('accepts a number of hours within a week', () => {
    expect(parseHours('12.5')).toBe(12.5)
    expect(parseHours('168')).toBe(168)
  })

  test('rejects blank, text, negative and more than a week', () => {
    expect(parseHours('')).toBe(null)
    expect(parseHours('lots')).toBe(null)
    expect(parseHours('-1')).toBe(null)
    expect(parseHours('169')).toBe(null)
  })

  test('zero is only for a capacity', () => {
    expect(parseHours('0')).toBe(null)
    expect(parseHours('0', { allowZero: true })).toBe(0)
  })
})
