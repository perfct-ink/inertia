# Uploaded file items attached to tasks (many to many).
class CreateTaskFiles < ActiveRecord::Migration[7.2]
  def change
    create_table :task_files do |t|
      t.references :task, null: false, foreign_key: true
      t.references :file, null: false, foreign_key: { to_table: :documents }
      t.timestamps
      t.index %i[task_id file_id], unique: true
    end
  end
end
