# A custom field every task in a Space can carry (a "column" in Monday's
# terms). It borrows the Collection field types (FieldValue) but has no
# relation type yet; the values live in TaskFieldValue.
class TaskField < ApplicationRecord
  DATA_TYPES = FieldValue::TYPES
  # Keeps the schema small on purpose (see docs/project-management-features.md:
  # custom fields are Jira's most-complained-about complexity).
  MAX_PER_WORKSPACE = 30
  # What each type accepts, for error messages.
  EXPECTED = {
    "text" => "text", "integer" => "a whole number", "number" => "a number", "boolean" => "true or false",
    "date" => "a date (YYYY-MM-DD)", "datetime" => "a date and time (ISO 8601)"
  }.freeze

  belongs_to :workspace
  has_many :task_field_values, dependent: :destroy

  normalizes :name, with: ->(name) { name.strip }
  validates :name, presence: true, length: { maximum: 255 }, uniqueness: { scope: :workspace_id, case_sensitive: false }
  validates :data_type, inclusion: { in: DATA_TYPES }
  validate :compatible_schema_change
  validate :within_workspace_limit, on: :create

  default_scope { order(:id) }

  # nil when the value fits this field's type, else what it should have been.
  def value_error(value)
    "must be #{EXPECTED.fetch(data_type, data_type)}" unless FieldValue.valid?(data_type, value)
  end

  private

  def compatible_schema_change
    if persisted? && data_type_changed? && task_field_values.exists?
      errors.add(:data_type, "cannot change while tasks have values for this field; clear them first")
    end
  end

  def within_workspace_limit
    if workspace && workspace.task_fields.count >= MAX_PER_WORKSPACE
      errors.add(:base, "A Space can have at most #{MAX_PER_WORKSPACE} custom fields")
    end
  end
end
