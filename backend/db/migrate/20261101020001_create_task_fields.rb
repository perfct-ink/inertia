# Custom fields on tasks: a Space defines named, typed fields (the same scalar
# types as Collection fields) that every task in the Space can carry.
class CreateTaskFields < ActiveRecord::Migration[7.2]
  def change
    create_table :task_fields do |t|
      t.references :workspace, null: false, foreign_key: true
      t.string :name, null: false
      t.string :data_type, null: false
      t.timestamps
    end
    add_index :task_fields, [ :workspace_id, :name ], unique: true
  end
end
