class TableCell < ApplicationRecord
  belongs_to :table_record
  belongs_to :table_field
  belongs_to :related_record, class_name: "TableRecord", optional: true
  validates :table_field_id, uniqueness: { scope: :table_record_id }
  validate :valid_value

  private

  def valid_value
    return unless table_field && table_record
    errors.add(:table_field, "must belong to this table") unless table_field.document_id == table_record.document_id
    valid = case table_field.data_type
    when "text" then value.is_a?(String)
    when "integer" then value.is_a?(Integer)
    when "number" then value.is_a?(Numeric) && value.finite?
    when "boolean" then value == true || value == false
    when "date" then valid_date?(value)
    when "datetime" then value.is_a?(String) && valid_datetime?(value)
    when "relation" then value.nil? && related_record&.document_id == table_field.relation_table_id
    else false
    end
    valid &&= related_record_id.nil? unless table_field.data_type == "relation"
    errors.add(:value, "must match #{table_field.name}'s #{table_field.data_type} type") unless valid
  end

  def valid_date?(value)
    value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}\z/) && Date.iso8601(value).iso8601 == value
  rescue ArgumentError
    false
  end

  def valid_datetime?(value)
    return false unless value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/)
    DateTime.iso8601(value)
    true
  rescue ArgumentError
    false
  end
end
