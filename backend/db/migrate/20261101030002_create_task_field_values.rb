# One row per task per field that has a value. An empty value (no tags,
# unchecked, no rating, no votes) is stored as no row at all.
class CreateTaskFieldValues < ActiveRecord::Migration[7.2]
  def change
    create_table :task_field_values do |t|
      t.references :task, null: false, foreign_key: true
      t.references :task_field, null: false, foreign_key: true
      t.json :value, null: false
      t.timestamps
    end
    add_index :task_field_values, [ :task_id, :task_field_id ], unique: true
  end
end
