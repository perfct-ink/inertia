import { useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ClipboardList, Loader2, Plus } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import {
  useCreateProjectRequest, useDecideProjectRequest, useDeleteProjectRequest, useProjectRequests, useUpdateProjectRequest,
} from '@/api/projectRequests'
import { useWorkspace } from '@/api/workspace'
import { canManageWorkspace, canWriteWorkspace } from '@/api/workspaces'
import {
  PROJECT_REQUEST_PRIORITY_LABEL,
  PROJECT_REQUEST_STATUSES,
  PROJECT_REQUEST_STATUS_LABEL,
  canDeleteProjectRequest,
  canEditProjectRequest,
  emptyProjectRequestForm,
  formFromProjectRequest,
  isWithdrawal,
  projectRequestCounts,
  projectRequestInput,
  requestedDates,
  requestsWithStatus,
} from '@/data/projectRequest'
import { usePageTitle } from '@/hooks/usePageTitle'
import { useAuthStore } from '@/store/auth'
import type { ProjectRequest, ProjectRequestStatus } from '@/types'
import DecisionDialog, { type Decision } from './ProjectRequestDecisionDialog'
import ProjectRequestForm from './ProjectRequestForm'
import '../planning/PlanningScreen.scss'
import './ProjectRequestsScreen.scss'
import { usePaths } from '@/hooks/usePaths'

const formatDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy')

// Project intake. Any member who can write submits a request with the
// project's purpose and dates; an admin or owner approves it (which creates
// the project) or declines it with a reason.
export default function ProjectRequestsScreen() {
  usePageTitle('Project requests')
  const { data: requests = [], isLoading } = useProjectRequests()
  const { data: workspace } = useWorkspace()
  const userId = useAuthStore((s) => s.user?.id)
  const isManager = canManageWorkspace(workspace?.role)
  const canSubmit = canWriteWorkspace(workspace?.role)
  const createRequest = useCreateProjectRequest()
  const updateRequest = useUpdateProjectRequest()
  const deleteRequest = useDeleteProjectRequest()
  const decideRequest = useDecideProjectRequest()
  const [tab, setTab] = useState<ProjectRequestStatus>('pending')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deciding, setDeciding] = useState<{ request: ProjectRequest; decision: Decision } | null>(null)
  const [deleting, setDeleting] = useState<ProjectRequest | null>(null)

  const counts = projectRequestCounts(requests)
  const shown = requestsWithStatus(requests, tab)

  return (
    <WorkspaceLayout>
      <div className="view-planning view-project_requests">
        <div className="planning-header">
          <h1 className="planning-title">Project requests</h1>
          {requests.length > 0 && (
            <div className="planning-tabs">
              {PROJECT_REQUEST_STATUSES.map((status) => (
                <Button
                  key={status}
                  aria-pressed={tab === status}
                  onClick={() => setTab(status)}
                  className={`planning-tab${tab === status ? ' planning-tab--active' : ''}`}
                >
                  {PROJECT_REQUEST_STATUS_LABEL[status]} ({counts[status]})
                </Button>
              ))}
            </div>
          )}
          {canSubmit && (
            <Button variant="primary" onClick={() => { setCreating(true); setEditingId(null) }} className="planning-new">
              <Plus className="planning-icon" aria-hidden="true" />
              New request
            </Button>
          )}
        </div>

        <div className="planning-body">
          <div className="planning-list">
            {creating && (
              <div className="planning-new_card">
                <ProjectRequestForm
                  initial={emptyProjectRequestForm()}
                  submitLabel="Submit request"
                  busy={createRequest.isPending}
                  onCancel={() => setCreating(false)}
                  onSubmit={(draft) => createRequest.mutate(projectRequestInput(draft), {
                    onSuccess: () => { setCreating(false); setTab('pending') },
                  })}
                />
              </div>
            )}

            {isLoading && <Loader2 className="planning-spinner" aria-label="Loading" />}

            {!isLoading && requests.length === 0 && !creating && (
              <div className="planning-empty">
                <ClipboardList className="planning-empty_icon" aria-hidden="true" />
                <p>
                  No project requests yet.
                  {canSubmit && ' Request a project and an admin of this Space decides whether it goes ahead.'}
                </p>
              </div>
            )}

            {!isLoading && requests.length > 0 && shown.length === 0 && (
              <div className="planning-empty">
                <p>No {PROJECT_REQUEST_STATUS_LABEL[tab].toLowerCase()} requests.</p>
              </div>
            )}

            {shown.map((request) => editingId === request.id ? (
              <div key={request.id} className="planning-new_card">
                <ProjectRequestForm
                  initial={formFromProjectRequest(request)}
                  submitLabel="Save changes"
                  busy={updateRequest.isPending}
                  onCancel={() => setEditingId(null)}
                  onSubmit={(draft) => updateRequest.mutate({ id: request.id, ...projectRequestInput(draft) }, {
                    onSuccess: () => setEditingId(null),
                  })}
                />
              </div>
            ) : (
              <RequestCard
                key={request.id}
                request={request}
                canEdit={canSubmit && canEditProjectRequest(request, userId, isManager)}
                canDelete={canSubmit && canDeleteProjectRequest(request, userId, isManager)}
                isManager={isManager}
                withdrawing={isWithdrawal(request, userId)}
                busy={decideRequest.isPending}
                onEdit={() => { setEditingId(request.id); setCreating(false) }}
                onDelete={() => setDeleting(request)}
                onDecide={(decision) => setDeciding({ request, decision })}
                onReopen={() => decideRequest.mutate({ id: request.id, decision: 'reopen' })}
              />
            ))}
          </div>
        </div>
      </div>

      <DecisionDialog
        request={deciding?.request ?? null}
        decision={deciding?.decision ?? null}
        busy={decideRequest.isPending}
        onClose={() => setDeciding(null)}
        onSubmit={(note) => deciding && decideRequest.mutate(
          { id: deciding.request.id, decision: deciding.decision, decision_note: note || undefined },
          { onSuccess: () => setDeciding(null) },
        )}
      />
      <ConfirmDialog
        open={deleting != null}
        title={deleting && isWithdrawal(deleting, userId) ? 'Withdraw request' : 'Delete request'}
        description={deleting ? `"${deleting.name}" will be removed.${deleting.project_id ? ' The project it created stays.' : ''}` : undefined}
        confirmLabel={deleting && isWithdrawal(deleting, userId) ? 'Withdraw' : 'Delete'}
        destructive
        onConfirm={() => deleting && deleteRequest.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </WorkspaceLayout>
  )
}

type CardProps = {
  request: ProjectRequest
  canEdit: boolean
  canDelete: boolean
  isManager: boolean
  withdrawing: boolean
  busy: boolean
  onEdit: () => void
  onDelete: () => void
  onDecide: (decision: Decision) => void
  onReopen: () => void
}

function RequestCard({ request, canEdit, canDelete, isManager, withdrawing, busy, onEdit, onDelete, onDecide, onReopen }: CardProps) {
  const paths = usePaths()
  const titleId = `project-request-${request.id}`
  const meta = [
    `${request.requested_by_name ? `Requested by ${request.requested_by_name}` : 'Requested'} on ${formatDate(request.created_at)}`,
    `${PROJECT_REQUEST_PRIORITY_LABEL[request.priority]} priority`,
    requestedDates(request, formatDate),
  ].filter(Boolean).join(' · ')
  const decidedBy = request.decided_by_name ?? 'an admin'
  const decidedOn = request.decided_at ? ` on ${formatDate(request.decided_at)}` : ''

  return (
    <article className="project_requests-card" aria-labelledby={titleId}>
      <div className="project_requests-card-top">
        <h2 id={titleId} className="project_requests-card-title">{request.name}</h2>
        <span className={`project_requests-status project_requests-status--${request.status}`}>
          {PROJECT_REQUEST_STATUS_LABEL[request.status]}
        </span>
      </div>
      <p className="project_requests-meta">{meta}</p>
      {request.description && <p className="project_requests-text">{request.description}</p>}
      {request.justification && (
        <>
          <h3 className="project_requests-label">Why it matters</h3>
          <p className="project_requests-text">{request.justification}</p>
        </>
      )}
      {request.status !== 'pending' && (
        <div className="project_requests-decision">
          <p>
            {request.status === 'approved' ? 'Approved' : 'Declined'} by {decidedBy}{decidedOn}
            {request.decision_note && <>: <span className="project_requests-text">{request.decision_note}</span></>}
          </p>
          {request.project_id != null && (
            <Link to={paths.folder(request.project_id)} className="project_requests-link">Open project</Link>
          )}
        </div>
      )}
      <div className="project_requests-actions">
        {request.status === 'pending' && isManager && (
          <>
            <Button variant="primary" disabled={busy} onClick={() => onDecide('approve')}>Approve</Button>
            <Button variant="secondary" disabled={busy} onClick={() => onDecide('decline')}>Decline</Button>
          </>
        )}
        {request.status === 'declined' && isManager && (
          <Button variant="secondary" disabled={busy} onClick={onReopen}>Reopen</Button>
        )}
        {canEdit && <Button variant="secondary" onClick={onEdit}>Edit</Button>}
        {canDelete && <Button variant="secondary" onClick={onDelete}>{withdrawing ? 'Withdraw' : 'Delete'}</Button>}
      </div>
    </article>
  )
}
