# Mirror fields in collections: a mirror shows a field of the record that a
# relation (connect) field in the same collection points at. A mirror holds no
# cells; it names the relation field it reads through and the field to show
# from the related collection. Deleting either field deletes the mirror, so no
# mirror is left pointing at nothing.
class AddMirrorToTableFields < ActiveRecord::Migration[7.2]
  def change
    add_reference :table_fields, :mirror_relation_field, foreign_key: { to_table: :table_fields, on_delete: :cascade }
    add_reference :table_fields, :mirror_field, foreign_key: { to_table: :table_fields, on_delete: :cascade }
  end
end
