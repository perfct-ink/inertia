class TableRecord < ApplicationRecord
  belongs_to :document
  has_many :incoming_cells, class_name: "TableCell", foreign_key: :related_record_id, dependent: :restrict_with_error
  has_many :table_cells, dependent: :destroy
  validate { errors.add(:document, "must be a table") unless document&.table? }

  # Copying a Collection keeps the numbers its records already have instead of
  # giving the copies new ones.
  attr_accessor :keep_auto_numbers

  after_create :assign_auto_numbers, unless: :keep_auto_numbers

  # `fields` are the Collection's fields. A created or updated time field is
  # worked out from the record here (it has no cell); `display` has the values
  # whose format changes how they read (money as $1,250.00), keyed like `values`.
  def as_table_json(fields = [])
    values = table_cells.to_h { |cell| [ cell.table_field_id.to_s, cell.related_record_id || cell.value ] }
    fields.each { |field| values[field.id.to_s] = derived_value(field) if field.derived? }
    display = fields.filter_map do |field|
      text = FieldType.display(field.data_type, field.display_format, values[field.id.to_s]) unless values[field.id.to_s].nil?
      [ field.id.to_s, text ] if text
    end.to_h
    { id: id, values: values, display: display }
  end

  private

  def derived_value(field)
    (field.data_type == "created_time" ? created_at : updated_at).utc.iso8601
  end

  # Each auto-number field gives the new record its next number.
  def assign_auto_numbers
    document.table_fields.where(data_type: "auto_number").find_each do |field|
      table_cells.create!(table_field: field, value: field.take_number!)
    end
  end
end
