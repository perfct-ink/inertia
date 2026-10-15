# Shared by the planning levels that carry an owner and a lifecycle status
# (Milestone, Initiative).
module PlanningItem
  extend ActiveSupport::Concern

  included do
    belongs_to :owner, class_name: "User", optional: true
    enum :status, { planned: 0, active: 1, done: 2 }
    validate :owner_belongs_to_workspace
  end

  private

  def owner_belongs_to_workspace
    return if owner_id.blank? || workspace.nil?
    errors.add(:owner, "must be a member of the workspace") unless workspace.memberships.exists?(user_id: owner_id)
  end
end
