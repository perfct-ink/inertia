# Task fields can use the Collection field types (custom-fields-on-tasks): a
# type with several formats keeps the chosen one, and a formula field keeps
# its formula. Both stay null for the five original task kinds.
class AddFormatAndFormulaToTaskFields < ActiveRecord::Migration[8.1]
  def change
    add_column :task_fields, :display_format, :string
    add_column :task_fields, :formula, :text
  end
end
