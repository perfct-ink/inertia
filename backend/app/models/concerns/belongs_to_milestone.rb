# Initiatives, epics and tasks can each sit under a milestone. Whatever has
# none of its own inherits its parent's (see MilestoneRollup).
module BelongsToMilestone
  extend ActiveSupport::Concern

  included do
    belongs_to :milestone, optional: true
    validate :milestone_in_same_workspace
  end

  private

  def milestone_in_same_workspace
    return if milestone.nil? || milestone.workspace_id == workspace_id
    errors.add(:milestone, "must belong to the same workspace")
  end
end
