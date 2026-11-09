# One check-in on an ongoing task: the owner's status (on track, at risk or
# blocked, see TaskCheckIn::STATUSES) and an optional note, kept in order so
# the task's history reads like a log.
class CreateTaskCheckIns < ActiveRecord::Migration[7.2]
  def change
    create_table :task_check_ins do |t|
      t.references :task, null: false, foreign_key: true
      t.references :author, foreign_key: { to_table: :users, on_delete: :nullify }
      t.integer :status, null: false
      t.text :note
      t.datetime :created_at, null: false
    end
    add_index :task_check_ins, %i[task_id created_at]
  end
end
