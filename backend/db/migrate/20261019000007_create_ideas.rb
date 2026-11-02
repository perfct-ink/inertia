# Ideas and feature requests that can be promoted to an epic or initiative.
class CreateIdeas < ActiveRecord::Migration[7.2]
  def change
    create_table :ideas do |t|
      t.references :workspace, null: false, foreign_key: true
      t.references :submitted_by, foreign_key: { to_table: :users, on_delete: :nullify }
      t.string :title, null: false
      t.text :description
      t.integer :status, null: false, default: 0
      t.string :promoted_type
      t.bigint :promoted_id
      t.timestamps
    end
  end
end
