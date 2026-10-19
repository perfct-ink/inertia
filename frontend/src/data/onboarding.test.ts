import { completedSteps, mergeOnboarding, ONBOARDING_STEPS, sameOnboarding, type OnboardingFacts, type OnboardingStepId } from './onboarding'

const none: OnboardingFacts = { sharedSpaceCount: 0, docTypes: [], taskCount: 0, memberCount: 1 }

test('a new account has nothing done', () => {
  expect(completedSteps(none)).toEqual([])
})

test('steps tick off from what the account already has, in checklist order', () => {
  const facts = { sharedSpaceCount: 1, docTypes: ['spreadsheet', 'document'] as const, taskCount: 2, memberCount: 2 }
  expect(completedSteps({ ...facts, docTypes: [...facts.docTypes] })).toEqual(['space', 'document', 'sheet', 'tasks', 'invite'])
})

test('a table does not count as a document or a sheet', () => {
  expect(completedSteps({ ...none, docTypes: ['table'] })).toEqual([])
})

test('recorded steps stay done, and the roadmap only ever comes from a record', () => {
  expect(completedSteps(none, ['roadmap', 'document'])).toEqual(['document', 'roadmap'])
  expect(ONBOARDING_STEPS.map((s) => s.id)).toContain('roadmap')
})

describe('server sync', () => {
  const progress = (dismissed: boolean, done: OnboardingStepId[]) => ({ dismissed, done })

  test('mergeOnboarding keeps the server choice and the union of ticked steps', () => {
    expect(mergeOnboarding(progress(true, ['space']), progress(false, ['document']))).toEqual({ dismissed: false, done: ['document', 'space'] })
    expect(mergeOnboarding(undefined, progress(true, ['tasks']))).toEqual({ dismissed: true, done: ['tasks'] })
  })

  test('with nothing on the server the local progress stands, and with nothing anywhere it is null', () => {
    expect(mergeOnboarding(progress(false, ['space']), null)).toEqual({ dismissed: false, done: ['space'] })
    expect(mergeOnboarding(undefined, null)).toBeNull()
  })

  test('sameOnboarding ignores the order of steps', () => {
    expect(sameOnboarding(progress(false, ['space', 'tasks']), progress(false, ['tasks', 'space']))).toBe(true)
    expect(sameOnboarding(progress(false, ['space']), progress(true, ['space']))).toBe(false)
    expect(sameOnboarding(progress(false, ['space']), progress(false, []))).toBe(false)
    expect(sameOnboarding(undefined, null)).toBe(false)
    expect(sameOnboarding(null, null)).toBe(true)
  })
})
