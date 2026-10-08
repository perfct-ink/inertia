class CreateRelationalTables < ActiveRecord::Migration[7.2]
  def change
    create_table :table_fields do |t|
      t.references :document, null: false, foreign_key: true
      t.string :name, null: false
      t.string :data_type, null: false
      t.references :relation_table, foreign_key: { to_table: :documents }
      t.timestamps
    end
    add_index :table_fields, [:document_id, :name], unique: true

    create_table :table_records do |t|
      t.references :document, null: false, foreign_key: true
      t.timestamps
    end

    create_table :table_cells do |t|
      t.references :table_record, null: false, foreign_key: true
      t.references :table_field, null: false, foreign_key: true
      t.json :value
      t.references :related_record, foreign_key: { to_table: :table_records }
      t.timestamps
    end
    add_index :table_cells, [:table_record_id, :table_field_id], unique: true
  end
end
