class TableRecord < ApplicationRecord
  belongs_to :document
  has_many :incoming_cells, class_name: "TableCell", foreign_key: :related_record_id, dependent: :restrict_with_error
  has_many :table_cells, dependent: :destroy
  validate { errors.add(:document, "must be a table") unless document&.table? }

  # `places` holds what the geocoder found for a field's text (see Geocoding), by field id.
  def as_table_json
    {
      id: id,
      values: table_cells.to_h { |cell| [ cell.table_field_id.to_s, cell.related_record_id || cell.value ] },
      places: table_cells.select(&:geocode).to_h { |cell| [ cell.table_field_id.to_s, cell.geocode ] }
    }
  end
end
