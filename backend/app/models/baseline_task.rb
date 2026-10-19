# One task's planned dates inside a baseline.
class BaselineTask < ApplicationRecord
  belongs_to :baseline
  belongs_to :task

  validates :due_date, presence: true
  validates :task_id, uniqueness: { scope: :baseline_id }
end
