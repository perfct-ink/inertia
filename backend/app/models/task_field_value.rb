# A task's value for one custom field (TaskField). A task has a row only for
# the fields it has a value for; clearing a value deletes the row.
class TaskFieldValue < ApplicationRecord
  belongs_to :task
  belongs_to :task_field

  validates :task_field_id, uniqueness: { scope: :task_id }
  validate :belongs_to_the_tasks_workspace
  validate :matches_field_type

  private

  def belongs_to_the_tasks_workspace
    return unless task && task_field
    errors.add(:task_field, "must belong to the task's Space") unless task_field.workspace_id == task.workspace_id
  end

  def matches_field_type
    message = task_field&.value_error(value)
    errors.add(:value, message) if message
  end
end
