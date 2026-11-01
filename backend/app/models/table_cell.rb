class TableCell < ApplicationRecord
  belongs_to :table_record
  belongs_to :table_field
  belongs_to :related_record, class_name: "TableRecord", optional: true
  validates :table_field_id, uniqueness: { scope: :table_record_id }
  validate :valid_value

  private

  def valid_value
    return unless table_field && table_record
    errors.add(:table_field, "must belong to this collection") unless table_field.document_id == table_record.document_id
    valid = case table_field.data_type
    when *FieldValue::TYPES then FieldValue.valid?(table_field.data_type, value)
    when "relation" then value.nil? && related_record&.document_id == table_field.relation_table_id
    else false
    end
    valid &&= related_record_id.nil? unless table_field.data_type == "relation"
    errors.add(:value, "must match #{table_field.name}'s #{table_field.data_type} type") unless valid
  end
end
