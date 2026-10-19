class Initiative < ApplicationRecord
  include PlanningItem
  include PlanningHealth
  include BelongsToMilestone
  include RoadmapHorizon

  belongs_to :workspace
  has_many :epics, dependent: :nullify
  has_many :key_results, dependent: :nullify
  has_many :documents, dependent: :nullify

  validates :title, presence: true
  validate :target_date_not_before_start_date

  # Mirrors Epic#tasks_count one level up. Tasks count when they sit under one
  # of its epics or in a document that names it. Initiatives are few per
  # workspace, so plain COUNT queries are fine here.
  def tasks_count
    rolled_up_tasks.count
  end

  def done_tasks_count
    rolled_up_tasks.where(status: Task.statuses[:done]).count
  end

  def percent
    total = tasks_count
    total.zero? ? 0 : (done_tasks_count * 100.0 / total).round
  end

  private

  def rolled_up_tasks
    Task.unscoped.left_joins(:epic, :document)
        .where("epics.initiative_id = :id OR documents.initiative_id = :id", id: id)
        .distinct
  end

  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
