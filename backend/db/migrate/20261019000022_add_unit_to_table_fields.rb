# A unit shown after a number field's values ("kg", "$", "%").
class AddUnitToTableFields < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :unit, :string
  end
end
