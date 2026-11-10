# A custom field every task in a Space can carry a value for (Monday-style
# column): tags, dropdown, checkbox, rating, vote, or any Collection field type
# (see TaskFieldType). The kind is fixed when the field is created, because
# values of one kind mean nothing as another.
class TaskField < ApplicationRecord
  belongs_to :workspace
  has_many :field_values, class_name: "TaskFieldValue", dependent: :destroy, inverse_of: :task_field

  validates :name, presence: true, length: { maximum: 100 },
    uniqueness: { scope: :workspace_id, case_sensitive: false }
  validates :field_type, inclusion: { in: TaskFieldType::TYPES }
  validate :field_type_is_not_changed, on: :update
  validate :options_fit_the_kind
  validates :display_format, inclusion: { in: ->(field) { FieldType.formats(field.field_type) }, message: "is not a format of this field's type" }, allow_nil: true
  validates :formula, presence: true, length: { maximum: TaskFieldType::MAX_FORMULA_LENGTH }, if: :formula?
  validate :formula_does_not_use_itself, if: :formula?

  before_validation { self.name = name.strip if name }
  before_validation { self.options = TaskFieldType.tidy_labels(options) }
  before_validation { self.display_format = nil if display_format.blank? }
  before_validation { self.formula = nil unless formula? }
  after_update :drop_values_for_removed_options, if: :saved_change_to_options?
  after_update :follow_rename_in_formulas, if: :saved_change_to_name?

  scope :ordered, -> { order(:id) }

  TaskFieldType::KINDS.each do |type|
    define_method(:"#{type}?") { field_type == type }
  end

  def formula? = field_type == TaskFieldType::FORMULA

  def choices? = TaskFieldType.choices?(field_type)

  private

  def field_type_is_not_changed
    errors.add(:field_type, "cannot be changed once the field exists") if field_type_changed?
  end

  def options_fit_the_kind
    return errors.add(:options, "must be a list of choices") unless options.is_a?(Array)

    if choices?
      errors.add(:options, "need at least one choice") if options.empty?
      errors.add(:options, "can have at most #{TaskFieldType::MAX_OPTIONS} choices") if options.size > TaskFieldType::MAX_OPTIONS
      errors.add(:options, "must be 1 to #{TaskFieldType::MAX_LABEL_LENGTH} characters each") unless options.all? { |option| TaskFieldType.label?(option) }
    elsif options.any?
      errors.add(:options, "only apply to dropdown and select fields")
    end
  end

  # A task that had picked a choice which is no longer offered goes back to
  # having no value, rather than keeping one the dropdown can't show.
  def drop_values_for_removed_options
    return unless choices?
    field_values.find_each do |field_value|
      if field_type == "multi_select"
        kept = Array(field_value.value) & options
        kept.empty? ? field_value.destroy : field_value.update_columns(value: kept, updated_at: Time.current)
      else
        field_value.destroy unless options.include?(field_value.value)
      end
    end
  end

  def formula_does_not_use_itself
    errors.add(:formula, "cannot refer to its own field") if formula.to_s.include?("{#{name}}")
  end

  # Renaming a field rewrites the formulas that use it, so they keep working.
  def follow_rename_in_formulas
    old_name, new_name = saved_change_to_name
    workspace.task_fields.where(field_type: TaskFieldType::FORMULA).where.not(id: id).find_each do |other|
      updated = other.formula.to_s.gsub("{#{old_name}}") { "{#{new_name}}" }
      other.update_columns(formula: updated, updated_at: Time.current) unless updated == other.formula
    end
  end
end
