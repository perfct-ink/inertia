class TableField < ApplicationRecord
  DATA_TYPES = %w[text integer number boolean date datetime relation].freeze
  belongs_to :document
  belongs_to :relation_table, class_name: "Document", optional: true
  has_many :table_cells, dependent: :destroy

  validates :name, presence: true, length: { maximum: 255 }, uniqueness: { scope: :document_id }
  validates :data_type, inclusion: { in: DATA_TYPES }
  validate :valid_table
  validate :compatible_schema_change

  private

  def valid_table
    errors.add(:document, "must be a table") unless document&.table?
    if data_type == "relation"
      unless relation_table&.table? && relation_table.folder.workspace_id == document&.folder&.workspace_id
        errors.add(:relation_table, "must be a table in this workspace")
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
end
