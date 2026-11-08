# Auto-number fields: the number the next record gets. Kept on the field so a
# number is never given out twice, even after the record that had it is deleted.
class AddNextNumberToTableFields < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :next_number, :integer
  end
end
