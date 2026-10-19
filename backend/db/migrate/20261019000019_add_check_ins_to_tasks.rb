# An ongoing task never completes: it asks its assignee for an update every
# `check_in_every_days` days, and each answer is saved as a check-in.
class AddCheckInsToTasks < ActiveRecord::Migration[7.2]
  def change
    add_column :tasks, :ongoing, :boolean, null: false, default: false
    add_column :tasks, :check_in_every_days, :integer
    add_column :tasks, :check_in_requested_at, :datetime

    create_table :task_check_ins do |t|
      t.references :task, null: false, foreign_key: true
      t.references :author, foreign_key: { to_table: :users, on_delete: :nullify }
      t.text :body, null: false
      t.datetime :created_at, null: false
    end
    add_index :task_check_ins, %i[task_id created_at]
  end
end
