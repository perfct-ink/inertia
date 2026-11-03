class TableRecord < ApplicationRecord
  belongs_to :document
  has_many :incoming_cells, class_name: "TableCell", foreign_key: :related_record_id, dependent: :restrict_with_error
  has_many :table_cells, dependent: :destroy
  validate { errors.add(:document, "must be a table") unless document&.table? }

  # formulas: a Formula::Results for the Collection's fields. formula_results
  # holds the saved result of each formula field, by field id.
  def as_table_json(formulas)
    values = table_cells.to_h { |cell| [ cell.table_field_id.to_s, cell.related_record_id || cell.value ] }
    { id: id, values: values, formula_results: formulas.for_record(values) }
  end
end
