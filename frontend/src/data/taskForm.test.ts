import type { TaskFormQuestion } from '@/types/taskForm'
import {
  answerProblems, changeKind, changeTarget, emptyAnswers, formStatusLabel, newQuestion, optionsFromText,
  optionsToText, publicFormUrl, takenTargets, targetsFor,
} from './taskForm'

const question = (opts: Partial<TaskFormQuestion> = {}): TaskFormQuestion =>
  ({ id: 'q1', label: 'Q', kind: 'short_text', target: 'details', required: false, options: [], ...opts })

describe('targetsFor', () => {
  test('lists the parts of the task each kind of question can fill in', () => {
    expect(targetsFor('short_text')).toEqual(['title', 'description', 'details'])
    expect(targetsFor('long_text')).toEqual(['description', 'details'])
    expect(targetsFor('date')).toEqual(['start_date', 'due_date', 'details'])
    expect(targetsFor('choice')).toEqual(['details'])
  })
})

describe('newQuestion', () => {
  test('is a blank optional extra detail with a fresh id', () => {
    expect(newQuestion([])).toEqual({ id: 'q1', label: '', kind: 'short_text', target: 'details', required: false, options: [] })
  })

  test('skips ids that are taken', () => {
    expect(newQuestion([question({ id: 'q2' })]).id).toBe('q3')
    expect(newQuestion([question({ id: 'q1' }), question({ id: 'q3' })]).id).toBe('q4')
  })
})

describe('changeKind', () => {
  test('keeps the target when the new type fits it', () => {
    expect(changeKind(question({ target: 'details' }), 'long_text')).toMatchObject({ kind: 'long_text', target: 'details' })
  })

  test('moves to a target the new type fits', () => {
    expect(changeKind(question({ target: 'title' }), 'date')).toMatchObject({ kind: 'date', target: 'start_date' })
    expect(changeKind(question({ target: 'description', kind: 'long_text' }), 'choice')).toMatchObject({ kind: 'choice', target: 'details' })
  })

  test('choices go with the type', () => {
    expect(changeKind(question({ kind: 'choice', options: ['a', 'b'] }), 'short_text').options).toEqual([])
    expect(changeKind(question({ kind: 'choice', options: ['a', 'b'] }), 'choice').options).toEqual(['a', 'b'])
  })
})

test('the title question is always required', () => {
  expect(changeTarget(question(), 'title')).toMatchObject({ target: 'title', required: true })
  expect(changeTarget(question({ required: true }), 'details').required).toBe(true)
  expect(changeTarget(question(), 'details').required).toBe(false)
})

test('takenTargets lists the single-use parts the other questions fill in', () => {
  const questions = [
    question({ id: 'a', target: 'title' }),
    question({ id: 'b', target: 'due_date', kind: 'date' }),
    question({ id: 'c', target: 'details' }),
    question({ id: 'd', target: 'description' }),
  ]
  expect([...takenTargets(questions, questions[3])].sort()).toEqual(['due_date', 'title'])
})

test('choices are typed one per line', () => {
  expect(optionsFromText(' High\n\nLow \n')).toEqual(['High', 'Low'])
  expect(optionsToText(['High', 'Low'])).toBe('High\nLow')
})

describe('answers', () => {
  const questions = [question({ id: 'a', label: 'Summary', required: true }), question({ id: 'b', label: 'More' })]

  test('start empty', () => {
    expect(emptyAnswers(questions)).toEqual({ a: '', b: '' })
  })

  test('only required questions left blank are problems', () => {
    expect(answerProblems(questions, { a: '  ', b: '' })).toEqual({ a: 'Summary is required' })
    expect(answerProblems(questions, { a: 'x', b: '' })).toEqual({})
  })
})

test('the public address uses the hash route', () => {
  expect(publicFormUrl('abc123', { origin: 'https://inertia.example', pathname: '/' })).toBe('https://inertia.example/#/f/abc123')
})

test('a form is open to the Space, public, or closed', () => {
  expect(formStatusLabel({ enabled: true, public_access: false })).toBe('Open to the Space')
  expect(formStatusLabel({ enabled: true, public_access: true })).toBe('Open, public link')
  expect(formStatusLabel({ enabled: false, public_access: true })).toBe('Closed')
})
