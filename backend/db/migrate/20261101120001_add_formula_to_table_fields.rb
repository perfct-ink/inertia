# Formula fields in Collections: the expression is stored on the field, the
# result is worked out by the web app from the record's other values and is
# never stored in table_cells.
class AddFormulaToTableFields < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :formula, :text
  end
end
