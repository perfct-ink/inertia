class TableField < ApplicationRecord
  # What each type stores, accepts and shows lives in FieldType.
  DATA_TYPES = FieldType::STORED
  DERIVED_TYPES = FieldType::DERIVED
  belongs_to :document
  belongs_to :relation_table, class_name: "Document", optional: true
  has_many :table_cells, dependent: :destroy

  # Worked out from the record's other values by the web app (see
  # frontend/src/data/formula.ts); never stored in table_cells.
  COMPUTED_TYPES = FieldType::COMPUTED
  MAX_FORMULA_LENGTH = 1000

  validates :name, presence: true, length: { maximum: 255 }, uniqueness: { scope: :document_id }
  validates :data_type, inclusion: { in: DATA_TYPES + DERIVED_TYPES + COMPUTED_TYPES }
  validates :display_format, inclusion: { in: ->(field) { FieldType.formats(field.data_type) }, message: "is not a format of this field's type" }, allow_nil: true
  validates :next_number, numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validates :formula, presence: true, length: { maximum: MAX_FORMULA_LENGTH }, if: :computed?
  validates :unit, length: { maximum: 20 }
  validate :unit_only_on_numbers
  validate :valid_table
  validate :compatible_schema_change
  validate :auto_number_type_is_fixed
  validate :choices_fit_type
  validate :formula_does_not_use_itself, if: :computed?
  before_validation { self.formula = nil unless computed? }
  before_validation :tidy_format_and_choices
  after_update :follow_rename_in_formulas, if: :saved_change_to_name?
  after_save :number_existing_records, if: -> { auto_number? && saved_change_to_data_type? }
  after_update :clear_removed_choices, if: -> { choices? && saved_change_to_options? }

  def computed?
    COMPUTED_TYPES.include?(data_type)
  end

  # Read from the record itself (created_time, updated_time): no cells.
  def derived?
    DERIVED_TYPES.include?(data_type)
  end

  def auto_number?
    data_type == "auto_number"
  end

  def choices?
    FieldType::CHOICE_TYPES.include?(data_type)
  end

  # Values of these cannot be written through the API: they are worked out,
  # read from the record, or numbered by the server.
  def read_only?
    computed? || derived? || auto_number?
  end

  # The number the next record of an auto-number field gets.
  def take_number!
    number = next_number || 1
    update_columns(next_number: number + 1)
    number
  end

  # What someone typed or imported, as the plain value this field stores.
  def plain_value(raw)
    FieldType.normalize(data_type, raw)
  end

  private

  # A format only means something for the type it belongs to; a type change
  # without a new format starts again from the default. Choices are tidied
  # like tags (trimmed, no blanks, no repeats ignoring case) and only kept on
  # fields that have choices.
  def tidy_format_and_choices
    self.display_format = nil if display_format.blank? || (data_type_changed? && !display_format_changed?)
    self.options = choices? ? TaskFieldType.tidy_labels(options) : nil
  end

  def choices_fit_type
    return unless choices?

    unless options.is_a?(Array) && options.all?(String)
      errors.add(:options, "must be a list of choices")
      return
    end
    errors.add(:options, "need at least one choice") if options.empty?
    errors.add(:options, "can have at most #{TaskFieldType::MAX_OPTIONS} choices") if options.size > TaskFieldType::MAX_OPTIONS
    errors.add(:options, "must be 1 to #{TaskFieldType::MAX_LABEL_LENGTH} characters each") unless options.all? { |choice| TaskFieldType.label?(choice) }
  end

  # An auto-number field's numbers belong to it; delete the field and add a new one instead.
  def auto_number_type_is_fixed
    errors.add(:data_type, "cannot change for an auto-number field") if persisted? && data_type_changed? && data_type_was == "auto_number"
  end

  # Records that were there first are numbered in the order they were made.
  def number_existing_records
    record_ids = document.table_records.order(:id).pluck(:id)
    TableCell.insert_all(record_ids.each_with_index.map { |record_id, i| { table_record_id: record_id, table_field_id: id, value: i + 1 } }) if record_ids.any?
    update_columns(next_number: record_ids.size + 1)
  end

  # Taking a choice off the list clears it from the records that used it.
  def clear_removed_choices
    table_cells.find_each do |cell|
      kept = data_type == "multi_select" ? Array(cell.value) & options : (options.include?(cell.value) ? cell.value : nil)
      next if kept == cell.value

      kept.blank? ? cell.destroy! : cell.update!(value: kept)
    end
  end

  # A unit ("kg", "$") makes sense for numbers only.
  def unit_only_on_numbers
    errors.add(:unit, "is only for integer and number fields") if unit.present? && !%w[integer number].include?(data_type)
  end

  def valid_table
    errors.add(:document, "must be a table") unless document&.table?
    if data_type == "relation"
      unless relation_table&.table? && relation_table.folder.workspace_id == document&.folder&.workspace_id
        errors.add(:relation_table, "must be a collection in this Space")
      end
    elsif relation_table_id.present?
      errors.add(:relation_table, "is only allowed for relation fields")
    end
  end

  def compatible_schema_change
    if persisted? && (data_type_changed? || relation_table_id_changed?) && table_cells.exists?
      errors.add(:data_type, "cannot change while this field has values; clear its values first")
    end
  end

  # Formulas name fields as {Field name}.
  def formula_does_not_use_itself
    errors.add(:formula, "cannot refer to its own field") if formula.to_s.include?("{#{name}}")
  end

  # Renaming a field rewrites the formulas that use it so they keep working.
  def follow_rename_in_formulas
    old_name, new_name = saved_change_to_name
    document.table_fields.where(data_type: COMPUTED_TYPES).where.not(id: id).find_each do |other|
      updated = other.formula.to_s.gsub("{#{old_name}}") { "{#{new_name}}" }
      other.update_columns(formula: updated, updated_at: Time.current) unless updated == other.formula
    end
  end
end
