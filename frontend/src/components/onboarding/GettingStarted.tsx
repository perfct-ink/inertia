import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, Circle, X } from 'lucide-react'
import { Button, FormError, PromptDialog } from '@/components/ui'
import { WorkspaceMembers } from '@/components/workspace/WorkspaceMembers'
import { useWorkspace } from '@/api/workspace'
import { useCreateWorkspace, useWorkspaces, useWorkspaceMembers } from '@/api/workspaces'
import { useTasks } from '@/api/tasks'
import { errorMessage } from '@/api/tables'
import { flattenFolders } from '@/data/folder'
import { completedSteps, ONBOARDING_STEPS, type OnboardingStepId } from '@/data/onboarding'
import { useNewDocument } from '@/hooks/useNewDocument'
import { useSwitchWorkspace } from '@/hooks/useSwitchWorkspace'
import { useAuthStore } from '@/store/auth'
import { useActiveOnboarding, useOnboardingStore } from '@/store/onboarding'
import './GettingStarted.scss'

// First steps for a new account, shown on the Space home until dismissed.
// Steps tick off when the user does them anywhere in the app.
export default function GettingStarted() {
  const navigate = useNavigate()
  const userId = useAuthStore((s) => s.user?.id)
  const progress = useActiveOnboarding(userId)
  const { data: workspace } = useWorkspace()
  const { data: workspaces = [] } = useWorkspaces()
  const { data: tasks = [] } = useTasks()
  const sharedSpace = workspace && !workspace.personal ? workspace : undefined
  const { data: members = [] } = useWorkspaceMembers(sharedSpace?.id ?? 0)
  const createWorkspace = useCreateWorkspace()
  const switchWorkspace = useSwitchWorkspace()
  const newDocument = useNewDocument()
  const [creatingSpace, setCreatingSpace] = useState(false)
  const [membersOpen, setMembersOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const done = completedSteps({
    sharedSpaceCount: workspaces.filter((w) => !w.personal).length,
    docTypes: flattenFolders(workspace?.folders ?? []).flatMap((f) => f.documents ?? []).map((d) => d.doc_type),
    taskCount: tasks.length,
    memberCount: members.length,
  }, progress?.done)
  const doneKey = done.join()

  // Remember what's done so switching Spaces doesn't untick it.
  useEffect(() => {
    if (userId != null && doneKey) useOnboardingStore.getState().record(userId, doneKey.split(',') as OnboardingStepId[])
  }, [userId, doneKey])

  if (userId == null || !progress) return null
  const dismiss = () => useOnboardingStore.getState().dismiss(userId)

  async function makeDocument(type: 'document' | 'spreadsheet') {
    setBusy(true); setError('')
    try { await newDocument(type) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  function createSpace(name: string) {
    if (!name) return
    createWorkspace.mutate(name, { onSuccess: switchWorkspace, onError: (e) => setError(errorMessage(e)) })
  }

  const actions: Record<OnboardingStepId, () => void> = {
    space: () => setCreatingSpace(true),
    document: () => makeDocument('document'),
    sheet: () => makeDocument('spreadsheet'),
    tasks: () => navigate('/tasks?view=backlog&new=1'),
    invite: () => setMembersOpen(true),
    roadmap: () => { useOnboardingStore.getState().record(userId, ['roadmap']); navigate('/roadmap') },
  }
  const allDone = done.length === ONBOARDING_STEPS.length

  return (
    <section className="getting_started" aria-labelledby="getting_started-title">
      <header className="getting_started-header">
        <div>
          <h2 id="getting_started-title" className="getting_started-title">{allDone ? 'You’re all set' : 'Get started with Inertia'}</h2>
          <p className="getting_started-progress">{done.length} of {ONBOARDING_STEPS.length} done</p>
        </div>
        <Button variant="ghost" className="getting_started-dismiss" aria-label="Hide getting started" title="Hide" onClick={dismiss}>
          <X className="getting_started-icon" aria-hidden="true" />
        </Button>
      </header>
      <div className="getting_started-bar" role="progressbar" aria-label="Getting started progress" aria-valuemin={0} aria-valuemax={ONBOARDING_STEPS.length} aria-valuenow={done.length}>
        <div className="getting_started-bar_fill" style={{ width: `${(done.length / ONBOARDING_STEPS.length) * 100}%` }} />
      </div>
      <FormError message={error} />
      <ol className="getting_started-steps">
        {ONBOARDING_STEPS.map((step) => {
          const isDone = done.includes(step.id)
          const needsSharedSpace = step.id === 'invite' && !sharedSpace
          return (
            <li key={step.id} className={`getting_started-step${isDone ? ' getting_started-step--done' : ''}`}>
              {isDone
                ? <CheckCircle2 className="getting_started-check" role="img" aria-label="Done" />
                : <Circle className="getting_started-check" role="img" aria-label="Not done" />}
              <div className="getting_started-text">
                <p className="getting_started-step_title">{step.title}</p>
                <p className="getting_started-description">
                  {step.description}
                  {needsSharedSpace && !isDone && ' Open a shared Space first; your personal Space is only for you.'}
                </p>
              </div>
              {!isDone && (
                <Button variant="secondary" className="getting_started-action" disabled={busy || needsSharedSpace} onClick={actions[step.id]}>
                  {step.actionLabel}
                </Button>
              )}
            </li>
          )
        })}
      </ol>
      {allDone && <Button variant="primary" onClick={dismiss}>Done</Button>}

      <PromptDialog open={creatingSpace} title="New Space" label="Space name" placeholder="e.g. Website relaunch" submitLabel="Create" onSubmit={createSpace} onClose={() => setCreatingSpace(false)} />
      {sharedSpace && <WorkspaceMembers workspace={sharedSpace} open={membersOpen} onClose={() => setMembersOpen(false)} />}
    </section>
  )
}
