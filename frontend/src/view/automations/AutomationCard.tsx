import { Button } from '@/components/ui'
import { describeRule, type AutomationContext, type AutomationRule } from '@/data/automation'

type Props = {
  rule: AutomationRule
  context: AutomationContext
  // Admins and owners switch rules on and off, edit and delete them.
  canManage: boolean
  busy: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}

// A saved automation as three lines: when, if (only with conditions), then.
export default function AutomationCard({ rule, context, canManage, busy, onToggle, onEdit, onDelete }: Props) {
  const titleId = `automation-${rule.id}`
  const summary = describeRule(rule, context)
  return (
    <article className={`automations-card${rule.enabled ? '' : ' automations-card--off'}`} aria-labelledby={titleId}>
      <div className="automations-card-top">
        <h2 id={titleId} className="automations-card-title">{rule.name}</h2>
        <span className={`automations-status automations-status--${rule.enabled ? 'on' : 'off'}`}>{rule.enabled ? 'On' : 'Off'}</span>
      </div>
      <dl className="automations-summary">
        <dt>When</dt>
        <dd>{summary.when}</dd>
        {summary.conditions.length > 0 && (
          <>
            <dt>If</dt>
            <dd>{summary.conditions.join(', and ')}</dd>
          </>
        )}
        <dt>Then</dt>
        <dd>{summary.then.join(', then ')}</dd>
      </dl>
      {canManage && (
        <div className="automations-actions">
          <Button variant="secondary" disabled={busy} onClick={onToggle}>{rule.enabled ? 'Turn off' : 'Turn on'}</Button>
          <Button variant="secondary" onClick={onEdit}>Edit</Button>
          <Button variant="secondary" onClick={onDelete}>Delete</Button>
        </div>
      )}
    </article>
  )
}
