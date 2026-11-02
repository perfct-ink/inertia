import type { ProjectRequest, ProjectRequestPriority, ProjectRequestStatus } from '@/types'

// Project intake (see ProjectRequest on the server): the option lists, the
// intake form's state and the rules for who may change a request.

export const PROJECT_REQUEST_STATUSES: ProjectRequestStatus[] = ['pending', 'approved', 'declined']

export const PROJECT_REQUEST_STATUS_LABEL: Record<ProjectRequestStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  declined: 'Declined',
}

export const PROJECT_REQUEST_PRIORITIES: ProjectRequestPriority[] = ['low', 'medium', 'high']

export const PROJECT_REQUEST_PRIORITY_LABEL: Record<ProjectRequestPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

// The intake form as the user types it: every field is a string so inputs stay controlled.
export interface ProjectRequestDraft {
  name: string
  description: string
  justification: string
  priority: ProjectRequestPriority
  start_date: string
  target_date: string
}

export const emptyProjectRequestForm = (): ProjectRequestDraft => ({
  name: '',
  description: '',
  justification: '',
  priority: 'medium',
  start_date: '',
  target_date: '',
})

export const formFromProjectRequest = (request: ProjectRequest): ProjectRequestDraft => ({
  name: request.name,
  description: request.description ?? '',
  justification: request.justification ?? '',
  priority: request.priority,
  start_date: request.start_date ?? '',
  target_date: request.target_date ?? '',
})

// What is wrong with the form, or null when it can be submitted. Mirrors the
// server's ProjectRequest validations so the user hears about it before the round trip.
export function projectRequestFormError(form: ProjectRequestDraft): string | null {
  if (!form.name.trim()) return 'Give the project a name.'
  if (form.start_date && form.target_date && form.target_date < form.start_date) {
    return 'The target date cannot be before the start date.'
  }
  return null
}

// The request body for the API: text trimmed, blank optional fields sent as null.
export interface ProjectRequestInput {
  name: string
  description: string | null
  justification: string | null
  priority: ProjectRequestPriority
  start_date: string | null
  target_date: string | null
}

export function projectRequestInput(form: ProjectRequestDraft): ProjectRequestInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    justification: form.justification.trim() || null,
    priority: form.priority,
    start_date: form.start_date || null,
    target_date: form.target_date || null,
  }
}

// Newest first, as the server returns them; stable for equal timestamps.
export function sortProjectRequests(requests: ProjectRequest[]): ProjectRequest[] {
  return [...requests].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id)
}

export function requestsWithStatus(requests: ProjectRequest[], status: ProjectRequestStatus): ProjectRequest[] {
  return sortProjectRequests(requests.filter((request) => request.status === status))
}

export function projectRequestCounts(requests: ProjectRequest[]): Record<ProjectRequestStatus, number> {
  const counts: Record<ProjectRequestStatus, number> = { pending: 0, approved: 0, declined: 0 }
  requests.forEach((request) => { counts[request.status] += 1 })
  return counts
}

// A pending request can be edited or withdrawn by whoever submitted it;
// admins and owners (managers) can also change it, and delete a decided one.
const isSubmitter = (request: ProjectRequest, userId: number | null | undefined) =>
  userId != null && request.requested_by_id === userId

export const canEditProjectRequest = (request: ProjectRequest, userId: number | null | undefined, isManager: boolean) =>
  request.status === 'pending' && (isManager || isSubmitter(request, userId))

export const canDeleteProjectRequest = (request: ProjectRequest, userId: number | null | undefined, isManager: boolean) =>
  isManager || (request.status === 'pending' && isSubmitter(request, userId))

// Deleting your own pending request reads as withdrawing it.
export const isWithdrawal = (request: ProjectRequest, userId: number | null | undefined) =>
  request.status === 'pending' && isSubmitter(request, userId)

// "Dec 1, 2026 to Feb 1, 2027", "From Dec 1, 2026", "By Feb 1, 2027", or null when undated.
export function requestedDates(request: Pick<ProjectRequest, 'start_date' | 'target_date'>, format: (iso: string) => string): string | null {
  const { start_date: start, target_date: target } = request
  if (start && target) return `${format(start)} to ${format(target)}`
  if (start) return `From ${format(start)}`
  if (target) return `By ${format(target)}`
  return null
}
