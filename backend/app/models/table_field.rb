class TableField < ApplicationRecord
  DATA_TYPES = %w[text integer number boolean date datetime relation file files mirror].freeze
  # A mirror shows a plain value the related record holds itself: not a link,
  # another mirror, a formula (worked out in the web app) or uploaded files.
  UNMIRRORABLE_TYPES = %w[relation mirror formula file files].freeze
  belongs_to :document
  belongs_to :relation_table, class_name: "Document", optional: true
  # A mirror reads through one relation field of its own collection
  # (mirror_relation_field) and shows one field of the collection it links to
  # (mirror_field). The database removes the mirror when either field goes.
  belongs_to :mirror_relation_field, class_name: "TableField", optional: true
  belongs_to :mirror_field, class_name: "TableField", optional: true
  has_many :table_cells, dependent: :destroy
  has_many :mirrors_through, class_name: "TableField", foreign_key: :mirror_relation_field_id, inverse_of: :mirror_relation_field
  has_many :mirrors_of, class_name: "TableField", foreign_key: :mirror_field_id, inverse_of: :mirror_field

  # Worked out from the record's other values by the web app (see
  # frontend/src/data/formula.ts); never stored in table_cells.
  COMPUTED_TYPES = %w[formula].freeze
  MAX_FORMULA_LENGTH = 1000

  validates :name, presence: true, length: { maximum: 255 }, uniqueness: { scope: :document_id }
  validates :data_type, inclusion: { in: DATA_TYPES + COMPUTED_TYPES }
  validates :formula, presence: true, length: { maximum: MAX_FORMULA_LENGTH }, if: :computed?
  validate :valid_table
  validate :valid_mirror
  validate :compatible_schema_change
  validate :mirrors_still_valid
  validate :formula_does_not_use_itself, if: :computed?
  before_validation { self.formula = nil unless computed? }
  before_validation :clear_mirror_targets, unless: -> { data_type == "mirror" }
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

  def clear_mirror_targets
    self.mirror_relation_field_id = nil
    self.mirror_field_id = nil
  end

  def valid_mirror
    return unless data_type == "mirror"
    unless mirror_relation_field&.data_type == "relation" && mirror_relation_field.document_id == document_id
      errors.add(:mirror_relation_field, "must be a relation field in this collection")
      return
    end
    unless mirror_field && mirror_field.document_id == mirror_relation_field.relation_table_id && UNMIRRORABLE_TYPES.exclude?(mirror_field.data_type)
      errors.add(:mirror_field, "must be a field of the connected collection that holds its own value, not a relation, mirror, formula or file")
    end
  end

  def compatible_schema_change
    if persisted? && (data_type_changed? || relation_table_id_changed?) && table_cells.exists?
      errors.add(:data_type, "cannot change while this field has values; clear its values first")
    end
  end

  # Keep every mirror pointing at a relation field and a plain field.
  def mirrors_still_valid
    return unless persisted?
    if (data_type_changed? || relation_table_id_changed?) && mirrors_through.exists?
      errors.add(:base, "Delete the mirror fields that read through #{name} before changing its data type or related collection")
    elsif data_type_changed? && UNMIRRORABLE_TYPES.include?(data_type) && mirrors_of.exists?
      errors.add(:data_type, "cannot become #{data_type} while a mirror field shows it; delete the mirror field first")
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
