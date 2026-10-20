# A relation field can hold many records (one-to-many). The linked records of a
# "many" cell live in table_cell_links so each keeps its foreign key.
class AddManyRelationsToCollections < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :allow_many, :boolean, null: false, default: false

    create_table :table_cell_links do |t|
      t.references :table_cell, null: false, foreign_key: true
      t.references :related_record, null: false, foreign_key: { to_table: :table_records }
      t.timestamps
      t.index %i[table_cell_id related_record_id], unique: true, name: "index_table_cell_links_on_cell_and_record"
    end
  end
end
