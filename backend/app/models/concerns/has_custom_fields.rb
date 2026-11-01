# Custom field values on a task (see TaskField and TaskFieldValue).
#
#   task.custom_fields = { "12" => 5, "13" => nil }  # set field 12, clear field 13
#   task.save                                         # checks every value, then writes them
#   task.custom_fields                                # => { "12" => 5 }
#
# Keys are TaskField ids. nil or "" clears a value; false and 0 are values.
# Nothing is written until the task itself saves, inside its transaction, so
# one bad value rejects the whole save. A field from another Space is unknown.
module HasCustomFields
  extend ActiveSupport::Concern

  included do
    has_many :task_field_values, dependent: :destroy
    validate :custom_field_values_fit_their_fields
    after_save :write_custom_field_values
  end

  def custom_fields=(values)
    @custom_field_input = values.to_h.transform_keys(&:to_s)
    @custom_field_changes = nil
  end

  def custom_fields
    task_field_values.to_h { |field_value| [ field_value.task_field_id.to_s, field_value.value ] }
  end

  private

  # [[id, field or nil, value or nil], ...]; a nil value clears the field.
  def custom_field_changes
    return [] if @custom_field_input.blank? || workspace.nil?
    @custom_field_changes ||= begin
      fields = workspace.task_fields.where(id: @custom_field_input.keys).index_by { |field| field.id.to_s }
      @custom_field_input.map { |id, value| [ id, fields[id], value == "" ? nil : value ] }
    end
  end

  def custom_field_values_fit_their_fields
    custom_field_changes.each do |id, field, value|
      if field.nil?
        errors.add(:base, "Unknown custom field #{id}")
      elsif !value.nil? && (message = field.value_error(value))
        errors.add(:base, "#{field.name} #{message}")
      end
    end
  end

  def write_custom_field_values
    return if custom_field_changes.empty?
    custom_field_changes.each do |_id, field, value|
      existing = task_field_values.find_by(task_field: field)
      if value.nil?
        existing&.destroy!
      else
        (existing || task_field_values.build(task_field: field)).update!(value: value)
      end
    end
    task_field_values.reset
    @custom_field_input = @custom_field_changes = nil
  end
end
