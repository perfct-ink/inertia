# A sticky note on a retrospective board, filed under one of the template's
# columns (`column_key`). A card in the action items column can be turned
# into a task, which `task_id` then points at; deleting the task frees the
# card to be turned into a new one.
class CreateRetroCards < ActiveRecord::Migration[7.2]
  def change
    create_table :retro_cards do |t|
      t.references :retrospective, null: false, foreign_key: true
      t.references :author, foreign_key: { to_table: :users, on_delete: :nullify }
      t.references :task, foreign_key: { on_delete: :nullify }
      t.string :column_key, null: false
      t.text :body, null: false

      t.timestamps
    end
  end
end
