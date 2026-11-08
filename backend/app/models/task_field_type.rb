# What each kind of task field stores and accepts, in one place so the model,
# the API and the frontend mirror (frontend/src/data/taskField.ts) agree.
#
#   text      a short string (up to MAX_TEXT_LENGTH characters)
#   integer   a whole number, within MAX_NUMBER
#   number    a number that can have decimals, within MAX_NUMBER
#   date      a day, "YYYY-MM-DD"
#   person    the id of someone who can open the Space (checked by TaskFieldValue)
#   tags      an array of short labels, free-form per task
#   dropdown  one of the labels the field defines in `options`
#   checkbox  true (unchecked is stored as no value)
#   rating    an integer from 1 to 5
#   vote      an array of the ids of the users who voted
#
# The scalar kinds (text, integer, number, date) use the same rules as the
# Collection types of the same name (FieldValue), and integer and number take
# the same formats (plain, commas); `display_format` on the field holds it.
module TaskFieldType
  # Typed values Collection cells hold too, minus boolean (a task's yes/no is
  # the checkbox) and datetime (see docs/features/task_fields.md).
  SCALAR_TYPES = %w[text integer number date].freeze
  TYPES = (SCALAR_TYPES + %w[person tags dropdown checkbox rating vote]).freeze
  RATING_RANGE = 1..5
  MAX_TAGS = 20
  MAX_LABEL_LENGTH = 40
  MAX_OPTIONS = 30
  MAX_TEXT_LENGTH = 500
  # Small enough that a number survives the trip through JavaScript exactly.
  MAX_NUMBER = 1_000_000_000_000

  module_function

  # Trims labels, drops blanks and repeats (ignoring case); anything that is
  # not a list of strings is returned untouched for validation to reject.
  def tidy_labels(list)
    return list unless list.is_a?(Array) && list.all?(String)
    list.map(&:strip).reject(&:empty?).uniq(&:downcase)
  end

  def normalize(type, value)
    case type
    when "tags" then tidy_labels(value)
    when "dropdown" then value.is_a?(String) ? value.strip : value
    when "vote" then value.is_a?(Array) ? value.uniq : value
    else value
    end
  end

  # Empty values are removed instead of stored. 0 is a value; an empty or
  # blank text is not.
  def blank_value?(type, value)
    case type
    when "text" then value.nil? || (value.is_a?(String) && value.strip.empty?)
    when "integer", "number", "date", "person" then value.nil? || value == ""
    when "tags", "vote" then value.nil? || value == []
    when "dropdown" then value.nil? || value == ""
    when "checkbox" then value.nil? || value == false
    else value.nil?
    end
  end

  def valid_value?(type, value, options: [])
    case type
    when "text" then FieldValue.valid?(type, value) && value.length <= MAX_TEXT_LENGTH
    when "integer", "number" then FieldValue.valid?(type, value) && value.abs <= MAX_NUMBER
    when "date" then FieldValue.valid?(type, value)
    when "person" then value.is_a?(Integer) && value.positive?
    when "tags" then value.is_a?(Array) && value.size <= MAX_TAGS && value.all? { |tag| label?(tag) }
    when "dropdown" then options.include?(value)
    when "checkbox" then value == true
    when "rating" then value.is_a?(Integer) && RATING_RANGE.cover?(value)
    when "vote" then value.is_a?(Array) && value.all? { |id| id.is_a?(Integer) && id.positive? }
    else false
    end
  end

  # The formats a kind can be shown in (none for most kinds).
  def formats(type) = FieldValue.formats(type)

  def label?(text)
    text.is_a?(String) && text.length.between?(1, MAX_LABEL_LENGTH)
  end
end
