class TableField < ApplicationRecord
  DATA_TYPES = %w[text integer number boolean date datetime relation file files].freeze
  belongs_to :document
  belongs_to :relation_table, class_name: "Document", optional: true
  has_many :table_cells, dependent: :destroy

  # Worked out from the record's other values, live by the web app (see
  # frontend/src/data/formula.ts) and for the saved record by Formula::Results;
  # never stored in table_cells.
  COMPUTED_TYPES = %w[formula].freeze
  MAX_FORMULA_LENGTH = 1000

  validates :name, presence: true, length: { maximum: 255 }, uniqueness: { scope: :document_id }
  validates :data_type, inclusion: { in: DATA_TYPES + COMPUTED_TYPES }
  validates :formula, presence: true, length: { maximum: MAX_FORMULA_LENGTH }, if: :computed?
  validate :valid_table
  validate :compatible_schema_change
  validate :formula_does_not_use_itself, if: :computed?
  before_validation { self.formula = nil unless computed? }
  after_update :follow_rename_in_formulas, if: :saved_change_to_name?

  def computed?
    COMPUTED_TYPES.include?(data_type)
  end

  private

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
