class Milestone < ApplicationRecord
  include PlanningItem

  belongs_to :workspace
  belongs_to :folder, optional: true
  has_many :initiatives, dependent: :nullify
  has_many :epics, dependent: :nullify
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validate :folder_in_same_workspace

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

  private

  def folder_in_same_workspace
    return if folder.nil? || folder.workspace_id == workspace_id
    errors.add(:folder, "must belong to the same workspace")
  end
end
