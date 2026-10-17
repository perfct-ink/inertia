import type { MilestoneHealth } from '@/types'
import { healthLabel } from '@/data/milestone'
import { classNames } from './classNames'
import './HealthBadge.scss'

// On track / At risk / Off track pill, shared by milestones and initiatives.
export function HealthBadge({ health, className }: { health: MilestoneHealth; className?: string }) {
  return <span className={classNames('ui-health', `ui-health--${health}`, className)}>{healthLabel(health)}</span>
}
