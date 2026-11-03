import { useMemo, useState } from 'react'
import { Loader2, Plus, Zap } from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'
import WorkspaceLayout from '@/components/WorkspaceLayout'
import { useCreateAutomationRule, useDeleteAutomationRule, useAutomationRules, useUpdateAutomationRule } from '@/api/automationRules'
import { useTaskStatusSettings } from '@/api/taskStatusSettings'
import { useWorkspace } from '@/api/workspace'
import { useWorkspaceMembers } from '@/api/workspaceMembers'
import { AUTOMATION_LIMITS, draftFromRule, emptyDraft, rulesLeft, type AutomationContext, type AutomationRule } from '@/data/automation'
import { resolveStatuses } from '@/data/task_status'
import { canManageWorkspace, canWriteWorkspace } from '@/data/workspace'
import { usePageTitle } from '@/hooks/usePageTitle'
import AutomationCard from './AutomationCard'
import AutomationForm from './AutomationForm'
import '../planning/PlanningScreen.scss'
import './AutomationsScreen.scss'

// Automations: rules a Space runs on its own ("when a task's status changes,
// if ..., then ..."). Members and above read them; admins and owners build,
// switch on and off, edit and delete them.
export default function AutomationsScreen() {
  usePageTitle('Automations')
  const { data: workspace } = useWorkspace()
  const role = workspace?.role
  return (
    <WorkspaceLayout>
      <div className="view-planning view-automations">
        {workspace && canWriteWorkspace(role) ? (
          <AutomationsList workspaceId={workspace.id} canManage={canManageWorkspace(role)} />
        ) : (
          <>
            <div className="planning-header"><h1 className="planning-title">Automations</h1></div>
            <div className="planning-body">
              {workspace ? (
                <div className="planning-empty">
                  <Zap className="planning-empty_icon" aria-hidden="true" />
                  <p>Automations are for the members of this Space.</p>
                </div>
              ) : (
                <div className="planning-loading"><Loader2 className="planning-spinner" aria-label="Loading" /></div>
              )}
            </div>
          </>
        )}
      </div>
    </WorkspaceLayout>
  )
}

function AutomationsList({ workspaceId, canManage }: { workspaceId: number; canManage: boolean }) {
  const { data: rules = [], isLoading } = useAutomationRules()
  const { data: settings } = useTaskStatusSettings()
  const { data: members } = useWorkspaceMembers(workspaceId)
  const createRule = useCreateAutomationRule()
  const updateRule = useUpdateAutomationRule()
  const deleteRule = useDeleteAutomationRule()
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<AutomationRule | null>(null)

  // The options: how this Space names its statuses and who is in it.
  const context = useMemo<AutomationContext>(() => ({
    statuses: resolveStatuses(settings ?? [], []),
    people: (members ?? []).map((member) => ({ id: member.user_id, name: member.user.name })),
  }), [settings, members])
  const atLimit = rulesLeft(rules) === 0

  return (
    <>
      <div className="planning-header">
        <h1 className="planning-title">Automations</h1>
        {canManage && !atLimit && (
          <Button variant="primary" onClick={() => { setCreating(true); setEditingId(null) }} className="planning-new">
            <Plus className="planning-icon" aria-hidden="true" />
            New automation
          </Button>
        )}
      </div>

      <div className="planning-body">
        <div className="planning-list">
          {canManage && atLimit && (
            <p className="automations-note">This Space has the most automations it can have ({AUTOMATION_LIMITS.rulesPerSpace}). Delete one to add another.</p>
          )}
          {!canManage && rules.length > 0 && <p className="automations-note">Only admins and owners can change automations.</p>}

          {creating && (
            <div className="planning-new_card">
              <AutomationForm
                initial={emptyDraft()}
                submitLabel="Create automation"
                busy={createRule.isPending}
                context={context}
                onCancel={() => setCreating(false)}
                onSubmit={(draft) => createRule.mutate(draft, { onSuccess: () => setCreating(false) })}
              />
            </div>
          )}

          {isLoading && <div className="planning-loading"><Loader2 className="planning-spinner" aria-label="Loading" /></div>}

          {!isLoading && rules.length === 0 && !creating && (
            <div className="planning-empty">
              <Zap className="planning-empty_icon" aria-hidden="true" />
              <p>
                No automations yet.
                {canManage ? ' Make one to have this Space act on its own when a task changes.' : ' An admin of this Space can make them.'}
              </p>
            </div>
          )}

          {rules.map((rule) => editingId === rule.id ? (
            <div key={rule.id} className="planning-new_card">
              <AutomationForm
                initial={draftFromRule(rule)}
                submitLabel="Save changes"
                busy={updateRule.isPending}
                context={context}
                onCancel={() => setEditingId(null)}
                onSubmit={(draft) => updateRule.mutate({ id: rule.id, ...draft }, { onSuccess: () => setEditingId(null) })}
              />
            </div>
          ) : (
            <AutomationCard
              key={rule.id}
              rule={rule}
              context={context}
              canManage={canManage}
              busy={updateRule.isPending}
              onToggle={() => updateRule.mutate({ id: rule.id, enabled: !rule.enabled })}
              onEdit={() => { setEditingId(rule.id); setCreating(false) }}
              onDelete={() => setDeleting(rule)}
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={deleting != null}
        title="Delete automation"
        description={deleting ? `"${deleting.name}" will stop running and be removed.` : undefined}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleting && deleteRule.mutate(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </>
  )
}
