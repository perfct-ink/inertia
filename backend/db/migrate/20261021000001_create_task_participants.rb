# People on a task: any number of assignees (the first is mirrored in
# tasks.assignee_id for older clients) and watchers who follow it.
class CreateTaskParticipants < ActiveRecord::Migration[7.2]
  def change
    create_table :task_participants do |t|
      t.references :task, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.integer :role, null: false, default: 0
      t.timestamps
    end
    add_index :task_participants, [ :task_id, :user_id, :role ], unique: true

    # Existing single assignees become the first assignee.
    execute <<~SQL.squish
      INSERT INTO task_participants (task_id, user_id, role, created_at, updated_at)
      SELECT id, assignee_id, 0, NOW(), NOW() FROM tasks WHERE assignee_id IS NOT NULL
    SQL
  end
end
