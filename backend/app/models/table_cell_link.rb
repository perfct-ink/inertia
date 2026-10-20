# One record linked from a "many" relation cell.
class TableCellLink < ApplicationRecord
  belongs_to :table_cell
  belongs_to :related_record, class_name: "TableRecord"
  validates :related_record_id, uniqueness: { scope: :table_cell_id }
  validate :record_in_related_collection

  private

  def record_in_related_collection
    field = table_cell&.table_field
    errors.add(:related_record, "must be in #{field&.relation_table&.title}") if field && related_record&.document_id != field.relation_table_id
  end
end
