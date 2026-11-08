require "date"

# What a plain scalar value is, in one place for everything that stores one:
# Collection cells (TableCell) and custom task fields (TaskFieldType) both ask
# here whether a text, integer, number, boolean, date or datetime value is
# valid. The web app mirrors it in frontend/src/data/fieldValue.ts, and both are
# checked against the same cases in frontend/src/data/fieldValue.vectors.json.
#
# A value is always stored plain; a type's format only changes how it is shown.
# Where a type has several formats the first is the default and a field picks
# one (an integer or number can be shown plain or with commas).
#
# The names and signatures (TYPES, valid?, formats, default_format, format_for)
# are the ones FieldType uses on the backlog/collection-field-types branch, so
# once that merges this module can be removed and its callers pointed at
# FieldType.
module FieldValue
  TYPES = %w[text integer number boolean date datetime].freeze

  FORMATS = {
    "integer" => %w[plain commas],
    "number" => %w[plain commas]
  }.freeze

  module_function

  def formats(type) = FORMATS.fetch(type, [])

  def default_format(type) = formats(type).first

  # The format a field shows: its own when it is one of the type's, else the default.
  def format_for(type, format) = formats(type).include?(format) ? format : default_format(type)

  # Whether a plain value fits a type. false and 0 are real values.
  def valid?(type, value)
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

  def date?(value)
    value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}\z/) && Date.iso8601(value).iso8601 == value
  rescue ArgumentError
    false
  end

  def datetime?(value)
    return false unless value.is_a?(String) && value.match?(/\A\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})\z/)

    DateTime.iso8601(value)
    true
  rescue ArgumentError
    false
  end
end
