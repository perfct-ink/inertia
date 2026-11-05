# Dated history of a number key result's value; current_value follows the latest.
class CreateKeyResultCheckIns < ActiveRecord::Migration[7.2]
  def change
    create_table :key_result_check_ins do |t|
      t.references :key_result, null: false, foreign_key: true
      t.references :author, foreign_key: { to_table: :users, on_delete: :nullify }
      t.decimal :value, precision: 15, scale: 2, null: false
      t.text :note
      t.timestamps
    end
  end
end
