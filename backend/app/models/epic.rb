class Epic < ApplicationRecord
  belongs_to :workspace
  belongs_to :folder, optional: true
  has_many :tasks, dependent: :nullify

  validates :title, presence: true
  validate :target_date_not_before_start_date

  # EpicsController#index preloads these via a grouped join (see there) so
  # listing epics doesn't run one COUNT query per epic. Falls back to a
  # real query so the model still works standalone (e.g. right after
  # create, or in tests) where that select never ran.
  def tasks_count
    attributes["tasks_count"]&.to_i || tasks.count
  end

  def done_tasks_count
    attributes["done_tasks_count"]&.to_i || tasks.where(status: :done).count
  end

  private

  # Matches the same rule the local .inertia-tasks file format already
  # enforces (docs/task-file-format.md) — and keeps EpicsPage.tsx's Timeline
  # view from having to render a bar with a negative span.
  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end
end
