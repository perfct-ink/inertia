import type { MilestoneHealth } from '@/types'
import { healthLabel } from '@/data/milestone'
import { classNames } from './classNames'
import './HealthBadge.scss'

// On track / At risk / Off track pill, shared by milestones and initiatives.
// `label` words it differently where the colour fits but the name doesn't
// (a check-in's "Blocked" is the red one).
export function HealthBadge({ health, label, className }: { health: MilestoneHealth; label?: string; className?: string }) {
  return <span className={classNames('ui-health', `ui-health--${health}`, className)}>{label ?? healthLabel(health)}</span>
}
