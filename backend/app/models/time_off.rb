# A person's leave: whole days from `start_date` to `end_date`, with an
# optional note. Resource planning takes the working days (Monday to Friday)
# in it, less any Space holidays, off the person's weekly capacity
# (WorkspaceMembership#weekly_capacity_hours) for those weeks.
class TimeOff < ApplicationRecord
  include DayRange

  belongs_to :workspace
  belongs_to :user

  validates :note, length: { maximum: 255 }
  validate :user_is_a_member

  private

  def user_is_a_member
    return if user_id.blank? || workspace.nil?
    errors.add(:user, "must be a member of the space") unless workspace.memberships.exists?(user_id: user_id)
  end
end
