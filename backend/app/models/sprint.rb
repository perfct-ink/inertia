# A time-boxed slice of work tasks can be assigned to — orthogonal to the
# Milestone -> Initiative -> Epic -> Task rollup chain (a sprint typically
# pulls tasks from several epics at once), so unlike Epic/Initiative this
# does not include BelongsToMilestone.
class Sprint < ApplicationRecord
  include PlanningItem

  belongs_to :workspace
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validate :end_date_not_before_start_date

  def tasks_count
    tasks.count
  end

  def done_tasks_count
    tasks.where(status: :done).count
  end

  private

  def end_date_not_before_start_date
    return unless start_date && end_date
    errors.add(:end_date, "can't be before the start date") if end_date < start_date
  end
end
