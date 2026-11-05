# One row each time a task's status changes (and one when it is created), so
# the history of a task and reports like burndown can be rebuilt later.
class CreateTaskStatusChanges < ActiveRecord::Migration[7.2]
  def change
    create_table :task_status_changes do |t|
      t.references :task, null: false, foreign_key: true
      t.references :changed_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.integer :from_status
      t.integer :to_status, null: false
      t.datetime :created_at, null: false
    end
    add_index :task_status_changes, %i[task_id created_at]
  end
end
