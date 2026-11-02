# Configurable statuses: how a board labels and colours the five task statuses.
# folder_id NULL is the Space default; a folder's rows apply to its own board
# and the folders nested under it. Task#status itself does not change.
class CreateTaskStatusSettings < ActiveRecord::Migration[7.2]
  def change
    create_table :task_status_settings do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :folder, foreign_key: true
      t.integer :status, null: false
      t.string :label
      t.string :color
      t.timestamps
    end

    # A NULL folder_id never collides in a plain unique index, so each scope
    # gets its own partial one: one row per status per board.
    add_index :task_status_settings, [ :workspace_id, :status ], unique: true, where: "folder_id IS NULL", name: "index_task_status_settings_on_space_default"
    add_index :task_status_settings, [ :folder_id, :status ], unique: true, where: "folder_id IS NOT NULL", name: "index_task_status_settings_on_folder_and_status"
  end
end
