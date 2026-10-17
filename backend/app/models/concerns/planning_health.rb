# Health for the planning levels that aim at a target date (Milestone,
# Initiative). Needs `done?` and `target_date`; the caller passes the rollup
# percent so each level can compute it the cheapest way it has.
module PlanningHealth
  extend ActiveSupport::Concern

  AT_RISK_WITHIN = 14.days
  AT_RISK_BELOW_PERCENT = 75

  # on_track / at_risk / off_track from the rollup percent and target date:
  # complete or undated is on track; a missed target date is off track; a
  # target within two weeks with under 75% done is at risk.
  def health(percent, today: Date.current)
    return "on_track" if done? || percent >= 100 || target_date.nil?
    return "off_track" if target_date < today
    return "at_risk" if target_date <= today + AT_RISK_WITHIN && percent < AT_RISK_BELOW_PERCENT
    "on_track"
  end
end
