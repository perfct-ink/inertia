# Gantt dependencies between tasks (PM-13). workspace_id is denormalized from
# the two tasks so the index and API can scope by it without a join.
class CreateTaskDependencies < ActiveRecord::Migration[7.2]
  def change
    create_table :task_dependencies do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :predecessor, null: false, foreign_key: { to_table: :tasks }
      t.references :successor, null: false, foreign_key: { to_table: :tasks }
      t.integer :kind, null: false, default: 0
      t.timestamps
    end
    add_index :task_dependencies, [ :predecessor_id, :successor_id ], unique: true
  end
end
