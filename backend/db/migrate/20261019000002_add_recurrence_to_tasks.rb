# A task can repeat: `recurrence` is an RRULE-style rule (FREQ and INTERVAL),
# and `recurrence_from` says whether the next one is counted from the due date
# (schedule) or from the day the task was completed.
class AddRecurrenceToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :recurrence, :string
    add_column :tasks, :recurrence_from, :integer, null: false, default: 0
  end
end
