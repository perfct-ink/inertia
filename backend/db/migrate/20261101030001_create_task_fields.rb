# Custom task fields (tags, dropdown, checkbox, rating, vote): a Space defines
# the fields once, and every task in the Space can then hold a value for each.
class CreateTaskFields < ActiveRecord::Migration[7.2]
  def change
    create_table :task_fields do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.string :field_type, null: false
      # The choices of a dropdown field; empty for every other kind.
      t.json :options, null: false, default: []
      t.timestamps
    end
    add_index :task_fields, [ :workspace_id, :name ], unique: true
  end
end
