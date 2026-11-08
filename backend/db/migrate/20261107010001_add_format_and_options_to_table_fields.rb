# Collection field types: a type can have a format (money: usd, eur...) that only
# changes how values are shown, and a single or multi select lists its choices.
class AddFormatAndOptionsToTableFields < ActiveRecord::Migration[7.2]
  def change
    add_column :table_fields, :display_format, :string
    add_column :table_fields, :options, :json
  end
end
