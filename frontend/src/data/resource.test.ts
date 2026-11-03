import type { Holiday, ResourceAllocation, TimeOff, WorkspaceMember } from '@/types'
import {
  allocationError, allocationPeriod, currentAllocations, currentSpans, daysOffLabel, daysOffReason, formatHours, HOURS_ERROR, holidayError, isActiveInWeek,
  loadPercent, overAllocated, parseHours, personLoads, projectLoads, spanError, spanPeriod, timeOffError, weekCapacity, weekEnd, weekNote, weekOff,
  weekRange, weekStart, workingDayCount, workingDays,
} from './resource'

const member = (userId: number, name: string, capacity = 40) =>
  ({ id: userId + 100, user_id: userId, role: 'member', weekly_capacity_hours: capacity, user: { id: userId, name, email: `${name}@example.com` } }) as WorkspaceMember
const alloc = (id: number, userId: number, folderId: number, hours: number, start: string | null = null, end: string | null = null) =>
  ({ id, user_id: userId, folder_id: folderId, hours_per_week: hours, start_date: start, end_date: end }) as ResourceAllocation
const timeOff = (id: number, userId: number, start: string, end: string) => ({ id, user_id: userId, start_date: start, end_date: end, note: null }) as TimeOff
const holiday = (id: number, name: string, start: string, end: string) => ({ id, name, start_date: start, end_date: end }) as Holiday

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

describe('working days', () => {
  test('a week has five working days, Monday to Friday', () => {
    expect(workingDays('2026-11-02')).toEqual(['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'])
  })

  test('counts Monday to Friday days between two dates, both included', () => {
    expect(workingDayCount('2026-11-02', '2026-11-06')).toBe(5)
    expect(workingDayCount('2026-11-09', '2026-11-09')).toBe(1)
    expect(workingDayCount('2026-11-06', '2026-11-09')).toBe(2)
    expect(workingDayCount('2026-11-07', '2026-11-08')).toBe(0)
    expect(workingDayCount('2026-11-02', '2026-11-15')).toBe(10)
    expect(workingDayCount('2026-11-04', '2026-11-10')).toBe(5)
    expect(workingDayCount('2026-11-05', '2026-11-12')).toBe(6)
  })

  test('an end before the start has none', () => {
    expect(workingDayCount('2026-11-10', '2026-11-09')).toBe(0)
  })
})

describe('weekOff', () => {
  const week = '2026-11-02'

  test('leave takes the working days it covers in the week, weekends do not count', () => {
    expect(weekOff(week, [timeOff(1, 1, '2026-11-04', '2026-11-05')], [])).toEqual({ days: 2, holiday: 0, leave: 2, holidays: [] })
    expect(weekOff(week, [timeOff(1, 1, '2026-11-06', '2026-11-10')], []).days).toBe(1)
    expect(weekOff('2026-11-09', [timeOff(1, 1, '2026-11-06', '2026-11-10')], []).days).toBe(2)
    expect(weekOff(week, [timeOff(1, 1, '2026-11-07', '2026-11-08')], []).days).toBe(0)
  })

  test('leave that spans the whole week takes all five days', () => {
    expect(weekOff(week, [timeOff(1, 1, '2026-10-26', '2026-11-20')], []).days).toBe(5)
  })

  test('a holiday names itself and takes its working days', () => {
    expect(weekOff(week, [], [holiday(1, 'Fall break', '2026-11-05', '2026-11-06')])).toEqual({ days: 2, holiday: 2, leave: 0, holidays: ['Fall break'] })
  })

  test('a holiday on a weekend takes nothing and is not named', () => {
    expect(weekOff(week, [], [holiday(1, 'Weekend fair', '2026-11-07', '2026-11-08')])).toEqual({ days: 0, holiday: 0, leave: 0, holidays: [] })
  })

  test('a day that is both a holiday and leave counts once', () => {
    const off = weekOff(week, [timeOff(1, 1, '2026-11-04', '2026-11-05')], [holiday(1, 'Fall break', '2026-11-05', '2026-11-05')])
    expect(off).toEqual({ days: 2, holiday: 1, leave: 1, holidays: ['Fall break'] })
  })

  test('overlapping leave does not count a day twice', () => {
    const off = weekOff(week, [timeOff(1, 1, '2026-11-03', '2026-11-04'), timeOff(2, 1, '2026-11-04', '2026-11-05')], [])
    expect(off.days).toBe(3)
  })

  test('no leave and no holidays is no days off', () => {
    expect(weekOff(week, [], [])).toEqual({ days: 0, holiday: 0, leave: 0, holidays: [] })
  })
})

describe('weekCapacity', () => {
  test('each day off takes a fifth of the weekly capacity', () => {
    expect(weekCapacity(40, { days: 0 })).toBe(40)
    expect(weekCapacity(40, { days: 2 })).toBe(24)
    expect(weekCapacity(20, { days: 1 })).toBe(16)
    expect(weekCapacity(33, { days: 1 })).toBe(26.4)
    expect(weekCapacity(40, { days: 5 })).toBe(0)
  })
})

describe('days off text', () => {
  test('says how many days are off, and nothing for a full week', () => {
    expect(daysOffLabel({ days: 0 })).toBe('')
    expect(daysOffLabel({ days: 1 })).toBe('1 day off')
    expect(daysOffLabel({ days: 2 })).toBe('2 days off')
  })

  test('says why: holidays by name, then leave', () => {
    expect(daysOffReason({ leave: 2, holidays: [] })).toBe('leave')
    expect(daysOffReason({ leave: 0, holidays: ['Fall break'] })).toBe('Fall break')
    expect(daysOffReason({ leave: 1, holidays: ['Fall break', 'Founders day'] })).toBe('Fall break, Founders day, leave')
    expect(daysOffReason({ leave: 0, holidays: [] })).toBe('')
  })
})

describe('personLoads with time off and holidays', () => {
  const members = [member(2, 'Ben', 20), member(1, 'Ada')]
  // Ada is off Wednesday and Thursday of the first week; the Space has a holiday on Wednesday 18 November.
  const absences = {
    timeOffs: [timeOff(1, 1, '2026-11-04', '2026-11-05'), timeOff(2, 2, '2026-11-25', '2026-11-27')],
    holidays: [holiday(1, 'Founders day', '2026-11-18', '2026-11-18')],
  }

  test('leave and holidays lower the capacity of that week only', () => {
    const [ada, ben] = personLoads(members, [alloc(1, 1, 10, 30)], weeks, absences)
    expect(ada.capacity).toBe(40)
    expect(ada.weeks.map((w) => w.capacity)).toEqual([24, 40, 32])
    expect(ada.weeks[0].off).toEqual({ days: 2, holiday: 0, leave: 2, holidays: [] })
    expect(ada.weeks[2].off).toEqual({ days: 1, holiday: 1, leave: 0, holidays: ['Founders day'] })
    expect(ben.weeks.map((w) => w.capacity)).toEqual([20, 20, 16])
  })

  test('hours above the reduced capacity are over, and the week warns', () => {
    const [ada, ben] = personLoads(members, [alloc(1, 1, 10, 30)], weeks, absences)
    expect(ada.weeks.map((w) => w.free)).toEqual([-6, 10, 2])
    expect(ada.weeks.map((w) => w.over)).toEqual([6, 0, 0])
    expect(ada.overWeeks).toBe(1)
    expect(ada.weeks.map(weekNote)).toEqual(['Over by 6 h', '10 h free', '2 h free'])
    expect(overAllocated([ada, ben]).map((l) => l.name)).toEqual(['Ada'])
  })

  test('someone else\'s leave does not lower my capacity', () => {
    const [ada] = personLoads([member(1, 'Ada')], [], weeks, { timeOffs: [timeOff(1, 2, '2026-11-02', '2026-11-06')], holidays: [] })
    expect(ada.weeks.map((w) => w.capacity)).toEqual([40, 40, 40])
  })

  test('a week off entirely has no capacity: free when nothing is planned, over when something is', () => {
    const wholeWeek = { timeOffs: [timeOff(1, 1, '2026-11-02', '2026-11-06')], holidays: [] }
    const [free] = personLoads([member(1, 'Ada')], [], weeks, wholeWeek)
    expect(free.weeks[0].capacity).toBe(0)
    expect(weekNote(free.weeks[0])).toBe('No capacity')
    const [busy] = personLoads([member(1, 'Ada')], [alloc(1, 1, 10, 10)], weeks, wholeWeek)
    expect(busy.weeks[0].over).toBe(10)
    expect(weekNote(busy.weeks[0])).toBe('Over by 10 h')
  })

  test('without time off or holidays capacity is the weekly capacity, as before', () => {
    const [ada] = personLoads([member(1, 'Ada')], [], weeks)
    expect(ada.weeks.map((w) => w.capacity)).toEqual([40, 40, 40])
    expect(ada.weeks[0].off.days).toBe(0)
  })
})

describe('currentSpans', () => {
  test('drops ones that finished before the first week and lists the rest earliest first', () => {
    const list = [timeOff(1, 1, '2026-11-16', '2026-11-17'), timeOff(2, 1, '2026-10-26', '2026-10-30'), timeOff(3, 1, '2026-10-30', '2026-11-02'), timeOff(4, 1, '2026-11-04', '2026-11-04')]
    expect(currentSpans(list, '2026-11-02').map((s) => s.id)).toEqual([3, 4, 1])
  })
})

test('spanPeriod says when leave or a holiday runs', () => {
  expect(spanPeriod({ start_date: '2026-11-09', end_date: '2026-11-09' })).toBe('Nov 9, 2026')
  expect(spanPeriod({ start_date: '2026-11-09', end_date: '2026-11-13' })).toBe('Nov 9 to Nov 13, 2026')
  expect(spanPeriod({ start_date: '2026-12-30', end_date: '2027-01-02' })).toBe('Dec 30, 2026 to Jan 2, 2027')
})

describe('time off and holiday forms', () => {
  test('a date range needs a start, and an end is optional but not before it', () => {
    expect(spanError({ start: '2026-11-09', end: '' })).toBe(null)
    expect(spanError({ start: '2026-11-09', end: '2026-11-09' })).toBe(null)
    expect(spanError({ start: '', end: '' })).toBe('Choose a start date.')
    expect(spanError({ start: '2026-11-09', end: '2026-11-08' })).toBe("The end date can't be before the start date.")
  })

  test('time off needs a person', () => {
    expect(timeOffError({ userId: '1', start: '2026-11-09', end: '' })).toBe(null)
    expect(timeOffError({ userId: '', start: '2026-11-09', end: '' })).toBe('Choose a person.')
    expect(timeOffError({ userId: '1', start: '', end: '' })).toBe('Choose a start date.')
  })

  test('a holiday needs a name', () => {
    expect(holidayError({ name: 'Founders day', start: '2026-11-18', end: '' })).toBe(null)
    expect(holidayError({ name: '  ', start: '2026-11-18', end: '' })).toBe('Enter a name for the holiday.')
    expect(holidayError({ name: 'Founders day', start: '2026-11-18', end: '2026-11-17' })).toBe("The end date can't be before the start date.")
  })
})
