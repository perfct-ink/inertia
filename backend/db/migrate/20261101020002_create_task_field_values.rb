# One row per task and field that has a value, stored as JSON like
# table_cells.value (an unset field simply has no row).
class CreateTaskFieldValues < ActiveRecord::Migration[7.2]
  def change
    create_table :task_field_values do |t|
      t.references :task, null: false, foreign_key: true
      t.references :task_field, null: false, foreign_key: true
      t.json :value
      t.timestamps
    end
    add_index :task_field_values, [ :task_id, :task_field_id ], unique: true
  end
end
