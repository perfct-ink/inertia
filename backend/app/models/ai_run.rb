# One attempt by an AI worker at a task. Holds only the text it produced (or
# the error); a run never edits the task itself.
class AiRun < ApplicationRecord
  include SameWorkspace

  belongs_to :workspace
  belongs_to :ai_worker
  belongs_to :task

  enum :status, { queued: 0, running: 1, succeeded: 2, failed: 3 }

  validates_same_workspace :ai_worker, :task
  validate :worker_is_enabled, on: :create
  validate :no_active_run_for_task_and_worker, on: :create

  scope :active, -> { where(status: [ statuses[:queued], statuses[:running] ]) }

  private

  def worker_is_enabled
    errors.add(:ai_worker, "is disabled") if ai_worker && !ai_worker.enabled?
  end

  # Clicking "run" twice shouldn't pay for the same work twice.
  def no_active_run_for_task_and_worker
    return unless ai_worker && task
    return unless AiRun.active.exists?(ai_worker_id: ai_worker_id, task_id: task_id)
    errors.add(:base, "This worker is already working on this task")
  end
end
