# An ongoing task never completes: it asks its assignees for an update on a
# schedule, `check_in_recurrence`, in the same RRULE subset as `recurrence`
# (see Recurrence). `last_check_in_at` is the clock for the next one (the
# last update, or when the task became ongoing) and `check_in_status` the
# status of the latest update, so listing tasks needs no query per task;
# `check_in_requested_at` is set while a request is waiting for an answer,
# so nobody is asked twice.
class AddCheckInsToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :ongoing, :boolean, null: false, default: false
    add_column :tasks, :check_in_recurrence, :string
    add_column :tasks, :check_in_status, :integer
    add_column :tasks, :last_check_in_at, :datetime
    add_column :tasks, :check_in_requested_at, :datetime
    add_index :tasks, :ongoing
  end
end
