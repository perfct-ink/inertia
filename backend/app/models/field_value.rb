# The scalar value rules shared by Collection cells (TableCell) and task custom
# field values (TaskFieldValue), so both agree on what a text, integer,
# number, boolean, date or datetime value is. Each rule takes the stored JSON
# value; false and 0 are real values.
module FieldValue
  TYPES = %w[text integer number boolean date datetime].freeze
  DATE = /\A\d{4}-\d{2}-\d{2}\z/
  DATETIME = /\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/

  def self.valid?(type, value)
    case type
    when "text" then value.is_a?(String)
    when "integer" then value.is_a?(Integer)
    when "number" then value.is_a?(Numeric) && value.finite?
    when "boolean" then value == true || value == false
    when "date" then date?(value)
    when "datetime" then datetime?(value)
    else false
    end
  end

  def self.date?(value)
    value.is_a?(String) && value.match?(DATE) && Date.iso8601(value).iso8601 == value
  rescue ArgumentError
    false
  end

  def self.datetime?(value)
    return false unless value.is_a?(String) && value.match?(DATETIME)
    DateTime.iso8601(value)
    true
  rescue ArgumentError
    false
  end
end
