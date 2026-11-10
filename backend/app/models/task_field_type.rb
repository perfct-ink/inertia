# What each kind of task field stores and accepts, in one place so the model,
# the API and the frontend mirror (frontend/src/data/taskField.ts) agree.
#
#   tags      an array of short labels, free-form per task
#   dropdown  one of the labels the field defines in `options`
#   checkbox  true (unchecked is stored as no value)
#   rating    an integer from 1 to 5
#   vote      an array of the ids of the users who voted
#
# A task field can also be any Collection field type that holds a value of its
# own (FieldType::VALUE: text, number, date, email, money and the rest), a
# person (a member of the Space) or a formula (worked out by the web app,
# never stored). Those share FieldType's checks and formats, so each type
# behaves the same in a Collection and on a task (Alex, 2026-11-09). Rating is
# the task kind of the same name.
module TaskFieldType
  KINDS = %w[tags dropdown checkbox rating vote].freeze
  COLLECTION_TYPES = ((FieldType::VALUE - KINDS) + %w[person formula]).freeze
  TYPES = (KINDS + COLLECTION_TYPES).freeze
  FORMULA = "formula".freeze
  MAX_FORMULA_LENGTH = 1000
  RATING_RANGE = 1..5
  MAX_TAGS = 20
  MAX_LABEL_LENGTH = 40
  MAX_OPTIONS = 30

  module_function

  # Trims labels, drops blanks and repeats (ignoring case); anything that is
  # not a list of strings is returned untouched for validation to reject.
  def tidy_labels(list)
    return list unless list.is_a?(Array) && list.all?(String)
    list.map(&:strip).reject(&:empty?).uniq(&:downcase)
  end

  def collection_type?(type) = COLLECTION_TYPES.include?(type)

  # Types whose choices live on the field (`options`).
  def choices?(type) = type == "dropdown" || FieldType::CHOICE_TYPES.include?(type)

  def normalize(type, value)
    return FieldType.normalize(type, value) if collection_type?(type)

    case type
    when "tags" then tidy_labels(value)
    when "dropdown" then value.is_a?(String) ? value.strip : value
    when "vote" then value.is_a?(Array) ? value.uniq : value
    else value
    end
  end

  # Empty values are removed instead of stored.
  def blank_value?(type, value)
    return value.nil? || value == "" || value == [] if collection_type?(type)

    case type
    when "tags", "vote" then value.nil? || value == []
    when "dropdown" then value.nil? || value == ""
    when "checkbox" then value.nil? || value == false
    else value.nil?
    end
  end

  def valid_value?(type, value, options: [])
    return false if type == FORMULA
    return FieldType.valid?(type, value, options: options) if collection_type?(type)

    case type
    when "tags" then value.is_a?(Array) && value.size <= MAX_TAGS && value.all? { |tag| label?(tag) }
    when "dropdown" then options.include?(value)
    when "checkbox" then value == true
    when "rating" then value.is_a?(Integer) && RATING_RANGE.cover?(value)
    when "vote" then value.is_a?(Array) && value.all? { |id| id.is_a?(Integer) && id.positive? }
    else false
    end
  end

  def label?(text)
    text.is_a?(String) && text.length.between?(1, MAX_LABEL_LENGTH)
  end
end
