# A per-person inbox. `kind` says what happened ("task_assigned", ...); the
# subject (a task, say) is polymorphic so the inbox can link to it.
class CreateNotifications < ActiveRecord::Migration[7.2]
  def change
    create_table :notifications do |t|
      t.references :user, null: false, foreign_key: true
      t.references :workspace, null: false, foreign_key: true
      t.string :kind, null: false
      t.string :title, null: false
      t.text :body
      t.string :subject_type
      t.bigint :subject_id
      t.datetime :read_at
      t.timestamps
    end
    add_index :notifications, %i[user_id read_at]
  end
end
