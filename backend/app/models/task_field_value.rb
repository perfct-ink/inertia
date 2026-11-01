# A task's value for one custom field. What is accepted depends on the field's
# kind (see TaskFieldType). Empty values are never stored; `write` removes the
# row instead.
class TaskFieldValue < ApplicationRecord
  belongs_to :task
  belongs_to :task_field

  validates :task_field_id, uniqueness: { scope: :task_id }
  validate :field_belongs_to_the_tasks_space
  validate :value_fits_the_field

  # Sets (or, for an empty value, clears) the task's value for the field.
  # Returns the record; check `errors` for a rejected value.
  def self.write(task, field, raw)
    value = TaskFieldType.normalize(field.field_type, raw)
    record = find_or_initialize_by(task: task, task_field: field)
    if TaskFieldType.blank_value?(field.field_type, value)
      record.destroy if record.persisted?
    else
      record.value = value
      record.save
    end
    record
  end

  private

  def field_belongs_to_the_tasks_space
    return unless task && task_field
    errors.add(:task_field, "must belong to the task's Space") unless task_field.workspace_id == task.workspace_id
  end

  def value_fits_the_field
    return unless task_field
    unless TaskFieldType.valid_value?(task_field.field_type, value, options: task_field.options)
      errors.add(:value, "is not valid for #{task_field.name} (#{task_field.field_type})")
    end
  end
end
