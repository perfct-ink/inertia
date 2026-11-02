# A custom field every task in a Space can carry a value for (Monday-style
# column): text, integer, number, date, datetime, tags, dropdown, checkbox,
# rating or vote. The kind is fixed when the field is created, because values
# of one kind mean nothing as another.
class TaskField < ApplicationRecord
  belongs_to :workspace
  has_many :field_values, class_name: "TaskFieldValue", dependent: :destroy, inverse_of: :task_field

  validates :name, presence: true, length: { maximum: 100 },
    uniqueness: { scope: :workspace_id, case_sensitive: false }
  validates :field_type, inclusion: { in: TaskFieldType::TYPES }
  validate :field_type_is_not_changed, on: :update
  validate :options_fit_the_kind

  before_validation { self.name = name.strip if name }
  before_validation { self.options = TaskFieldType.tidy_labels(options) }
  after_update :drop_values_for_removed_options, if: :saved_change_to_options?

  scope :ordered, -> { order(:id) }

  TaskFieldType::TYPES.each do |type|
    define_method(:"#{type}?") { field_type == type }
  end

  private

  def field_type_is_not_changed
    errors.add(:field_type, "cannot be changed once the field exists") if field_type_changed?
  end

  def options_fit_the_kind
    return errors.add(:options, "must be a list of choices") unless options.is_a?(Array)

    if dropdown?
      errors.add(:options, "need at least one choice") if options.empty?
      errors.add(:options, "can have at most #{TaskFieldType::MAX_OPTIONS} choices") if options.size > TaskFieldType::MAX_OPTIONS
      errors.add(:options, "must be 1 to #{TaskFieldType::MAX_LABEL_LENGTH} characters each") unless options.all? { |option| TaskFieldType.label?(option) }
    elsif options.any?
      errors.add(:options, "only apply to dropdown fields")
    end
  end

  # A task that had picked a choice which is no longer offered goes back to
  # having no value, rather than keeping one the dropdown can't show.
  def drop_values_for_removed_options
    return unless dropdown?
    field_values.find_each { |field_value| field_value.destroy unless options.include?(field_value.value) }
  end
end
