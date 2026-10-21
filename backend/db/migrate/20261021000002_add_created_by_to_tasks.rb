# Auto field: who created a task. Older tasks have no creator on record.
class AddCreatedByToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :created_by, foreign_key: { to_table: :users, on_delete: :nullify }
  end
end
