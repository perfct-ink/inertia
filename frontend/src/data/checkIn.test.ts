import { checkInLabel, CHECK_IN_STATUSES, CHECK_IN_STATUS_LABEL, CHECK_IN_STATUS_HEALTH } from './checkIn'

describe('check-in statuses', () => {
  test('every status has a label and a badge colour', () => {
    for (const status of CHECK_IN_STATUSES) {
      expect(CHECK_IN_STATUS_LABEL[status]).toBeTruthy()
      expect(CHECK_IN_STATUS_HEALTH[status]).toBeTruthy()
    }
    expect(CHECK_IN_STATUSES.map((s) => CHECK_IN_STATUS_LABEL[s])).toEqual(['On track', 'At risk', 'Blocked'])
    expect(CHECK_IN_STATUS_HEALTH.blocked).toBe('off_track')
  })
})

describe('checkInLabel', () => {
  test('is null for a task that is not ongoing', () => {
    expect(checkInLabel({})).toBeNull()
    expect(checkInLabel({ ongoing: false, check_in_recurrence: 'FREQ=WEEKLY' })).toBeNull()
  })

  test('names the schedule with the repeat picker wording', () => {
    expect(checkInLabel({ ongoing: true, check_in_recurrence: 'FREQ=WEEKLY' })).toBe('Ongoing · weekly')
    expect(checkInLabel({ ongoing: true, check_in_recurrence: 'FREQ=WEEKLY;INTERVAL=2' })).toBe('Ongoing · every 2 weeks')
    expect(checkInLabel({ ongoing: true, check_in_recurrence: 'FREQ=DAILY;INTERVAL=3' })).toBe('Ongoing · every 3 days')
    expect(checkInLabel({ ongoing: true, check_in_recurrence: null })).toBe('Ongoing')
  })

  test('says the check-in is overdue once its day has passed', () => {
    expect(checkInLabel({ ongoing: true, check_in_recurrence: 'FREQ=WEEKLY', check_in_stale: true })).toBe('Check-in overdue')
  })
})
