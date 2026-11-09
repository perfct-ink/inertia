import { HealthBadge } from '@/components/ui'
import { CHECK_IN_STATUS_HEALTH, CHECK_IN_STATUS_LABEL } from '@/data/checkIn'
import type { CheckInStatus } from '@/types'

// On track / At risk / Blocked pill for a check-in or the latest one on a task.
export function CheckInStatusBadge({ status, className }: { status: CheckInStatus; className?: string }) {
  return <HealthBadge health={CHECK_IN_STATUS_HEALTH[status]} label={CHECK_IN_STATUS_LABEL[status]} className={className} />
}
