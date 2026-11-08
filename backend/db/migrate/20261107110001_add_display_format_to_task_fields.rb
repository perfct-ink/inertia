# Task fields: an integer or number field can be shown plain or with commas. The
# format only changes how a value is shown, never what is stored.
class AddDisplayFormatToTaskFields < ActiveRecord::Migration[7.2]
  def change
    add_column :task_fields, :display_format, :string
  end
end
