class TableRecord < ApplicationRecord
  belongs_to :document
  has_many :incoming_cells, class_name: "TableCell", foreign_key: :related_record_id, dependent: :restrict_with_error
  has_many :incoming_links, class_name: "TableCellLink", foreign_key: :related_record_id, dependent: :restrict_with_error
  has_many :table_cells, dependent: :destroy
  validate { errors.add(:document, "must be a table") unless document&.table? }

  def as_table_json
    { id: id, values: table_cells.to_h { |cell| [ cell.table_field_id.to_s, cell_value(cell) ] } }
  end

  private

  # A "many" relation cell is the list of linked record ids.
  def cell_value(cell)
    cell.table_field.allow_many ? cell.links.map(&:related_record_id).sort : (cell.related_record_id || cell.value)
  end
end
