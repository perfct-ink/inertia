# Item type for a task: a plain task, a bug, or a story. Drives the bugs
# queue (the tasks list filtered to kind = bug).
class AddKindToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :kind, :integer, default: 0, null: false
    add_index :tasks, :kind
  end
end
