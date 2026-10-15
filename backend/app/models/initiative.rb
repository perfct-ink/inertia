class Initiative < ApplicationRecord
  include PlanningItem
  include BelongsToMilestone

  belongs_to :workspace
  has_many :epics, dependent: :nullify

  validates :title, presence: true
  validate :target_date_not_before_start_date

  # Mirrors Epic#tasks_count/#done_tasks_count one level up. Initiatives are
  # few per workspace (unlike epics or tasks), so a couple of plain COUNT
  # queries here is simpler than EpicsController#index's grouped-join
  # optimization and not worth the same treatment at this scale.
  def tasks_count
    Task.joins(:epic).where(epics: { initiative_id: id }).count
  end

  def done_tasks_count
    Task.joins(:epic).where(epics: { initiative_id: id }, status: Task.statuses[:done]).count
  end

  private

  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
