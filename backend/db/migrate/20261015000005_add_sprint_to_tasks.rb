class AddSprintToTasks < ActiveRecord::Migration[7.2]
  def change
    add_reference :tasks, :sprint, null: true, foreign_key: true
  end
end
