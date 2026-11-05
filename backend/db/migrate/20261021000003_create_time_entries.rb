# Time logged against a task: a timer (ended_at stays null while it runs) or
# a manual entry (both ends set).
class CreateTimeEntries < ActiveRecord::Migration[7.2]
  def change
    create_table :time_entries do |t|
      t.references :task, null: false, foreign_key: true
      t.references :user, null: false, foreign_key: true
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.timestamps
    end
    add_index :time_entries, [ :user_id, :ended_at ]
  end
end
