# A person's planned time on a project: `hours_per_week` between `start_date`
# and `end_date` (no start means already under way, no end means ongoing). The
# project is a folder with kind "project". Resource planning adds up a person's
# allocations week by week and compares the total with their weekly capacity
# (WorkspaceMembership#weekly_capacity_hours).
class ResourceAllocation < ApplicationRecord
  include SameWorkspace

  belongs_to :workspace
  belongs_to :user
  belongs_to :folder

  validates :hours_per_week, numericality: { greater_than: 0, less_than_or_equal_to: WorkspaceMembership::MAX_WEEKLY_HOURS }
  validates_same_workspace :folder
  validate :user_is_a_member
  validate :folder_is_a_project, if: -> { new_record? || folder_id_changed? }
  validate :end_date_not_before_start_date

  private

  def user_is_a_member
    return if user_id.blank? || workspace.nil?
    errors.add(:user, "must be a member of the space") unless workspace.memberships.exists?(user_id: user_id)
  end

  # Checked when the project is chosen, so a project later turned back into a
  # plain folder keeps the allocations it already has.
  def folder_is_a_project
    errors.add(:folder, "must be a project") if folder && !folder.project?
  end

  def end_date_not_before_start_date
    return unless start_date && end_date
    errors.add(:end_date, "can't be before the start date") if end_date < start_date
  end
end
