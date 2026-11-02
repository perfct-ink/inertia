import type { ProjectRequest } from '@/types'
import {
  canDeleteProjectRequest,
  canEditProjectRequest,
  emptyProjectRequestForm,
  formFromProjectRequest,
  isWithdrawal,
  projectRequestCounts,
  projectRequestFormError,
  projectRequestInput,
  requestedDates,
  requestsWithStatus,
  sortProjectRequests,
} from './projectRequest'

const request = (over: Partial<ProjectRequest> = {}): ProjectRequest => ({
  id: 1, name: 'Billing revamp', description: 'Rework invoicing', justification: null, priority: 'high', status: 'pending',
  start_date: '2026-12-01', target_date: '2027-02-01', decision_note: null, decided_at: null, project_id: null,
  requested_by_id: 7, requested_by_name: 'Mia', decided_by_id: null, decided_by_name: null,
  created_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z', ...over,
})

test('an empty form is medium priority with nothing filled in', () => {
  expect(emptyProjectRequestForm()).toEqual({
    name: '', description: '', justification: '', priority: 'medium', start_date: '', target_date: '',
  })
})

test('the form needs a name and a target date that is not before the start date', () => {
  const form = { ...emptyProjectRequestForm(), name: 'Billing' }
  expect(projectRequestFormError(form)).toBeNull()
  expect(projectRequestFormError({ ...form, name: '   ' })).toBe('Give the project a name.')
  expect(projectRequestFormError({ ...form, start_date: '2026-12-01', target_date: '2026-11-01' }))
    .toBe('The target date cannot be before the start date.')
  expect(projectRequestFormError({ ...form, start_date: '2026-12-01', target_date: '2026-12-01' })).toBeNull()
  expect(projectRequestFormError({ ...form, target_date: '2026-11-01' })).toBeNull()
})

test('the API input trims text and sends blanks as null', () => {
  expect(projectRequestInput({ ...emptyProjectRequestForm(), name: '  Billing  ', description: ' Why ' })).toEqual({
    name: 'Billing', description: 'Why', justification: null, priority: 'medium', start_date: null, target_date: null,
  })
})

test('editing starts from the saved request', () => {
  expect(formFromProjectRequest(request({ description: null, justification: 'Finance asked' }))).toEqual({
    name: 'Billing revamp', description: '', justification: 'Finance asked', priority: 'high',
    start_date: '2026-12-01', target_date: '2027-02-01',
  })
})

test('requests sort newest first and filter by status', () => {
  const requests = [
    request({ id: 1, created_at: '2026-11-01T10:00:00Z' }),
    request({ id: 2, created_at: '2026-11-03T10:00:00Z', status: 'declined' }),
    request({ id: 3, created_at: '2026-11-02T10:00:00Z' }),
    request({ id: 4, created_at: '2026-11-02T10:00:00Z', status: 'approved' }),
  ]
  expect(sortProjectRequests(requests).map((r) => r.id)).toEqual([2, 4, 3, 1])
  expect(requestsWithStatus(requests, 'pending').map((r) => r.id)).toEqual([3, 1])
  expect(requestsWithStatus(requests, 'approved').map((r) => r.id)).toEqual([4])
  expect(requests.map((r) => r.id)).toEqual([1, 2, 3, 4])
})

test('counts every status, including empty ones', () => {
  expect(projectRequestCounts([])).toEqual({ pending: 0, approved: 0, declined: 0 })
  expect(projectRequestCounts([request(), request({ id: 2 }), request({ id: 3, status: 'declined' })]))
    .toEqual({ pending: 2, approved: 0, declined: 1 })
})

test('the submitter edits and withdraws a pending request; managers also change decided ones', () => {
  const pending = request()
  const approved = request({ status: 'approved' })
  expect(canEditProjectRequest(pending, 7, false)).toBe(true)
  expect(canEditProjectRequest(pending, 8, false)).toBe(false)
  expect(canEditProjectRequest(pending, 8, true)).toBe(true)
  expect(canEditProjectRequest(approved, 7, true)).toBe(false)
  expect(canEditProjectRequest(pending, undefined, false)).toBe(false)

  expect(canDeleteProjectRequest(pending, 7, false)).toBe(true)
  expect(canDeleteProjectRequest(pending, 8, false)).toBe(false)
  expect(canDeleteProjectRequest(approved, 7, false)).toBe(false)
  expect(canDeleteProjectRequest(approved, 8, true)).toBe(true)
  expect(canDeleteProjectRequest(request({ requested_by_id: null }), null, false)).toBe(false)

  expect(isWithdrawal(pending, 7)).toBe(true)
  expect(isWithdrawal(pending, 8)).toBe(false)
  expect(isWithdrawal(approved, 7)).toBe(false)
})

test('requested dates read as a range, a start or a deadline', () => {
  const fmt = (iso: string) => `<${iso}>`
  expect(requestedDates({ start_date: '2026-12-01', target_date: '2027-02-01' }, fmt)).toBe('<2026-12-01> to <2027-02-01>')
  expect(requestedDates({ start_date: '2026-12-01', target_date: null }, fmt)).toBe('From <2026-12-01>')
  expect(requestedDates({ start_date: null, target_date: '2027-02-01' }, fmt)).toBe('By <2027-02-01>')
  expect(requestedDates({ start_date: null, target_date: null }, fmt)).toBeNull()
})
