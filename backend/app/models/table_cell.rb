class TableCell < ApplicationRecord
  belongs_to :table_record
  belongs_to :table_field
  belongs_to :related_record, class_name: "TableRecord", optional: true
  validates :table_field_id, uniqueness: { scope: :table_record_id }
  validate :valid_value

  MAX_FILES = 50

  private

  # Every id is an uploaded file item in the same Space as the collection.
  def files_in_space?(ids)
    return true if ids.empty?
    workspace_id = table_field.document.folder.workspace_id
    Document.joins(:folder).where(id: ids, doc_type: :file, folders: { workspace_id: workspace_id }).count == ids.size
  end

  def valid_value
    return unless table_field && table_record
    errors.add(:table_field, "must belong to this collection") unless table_field.document_id == table_record.document_id
    valid = case table_field.data_type
    when *FieldValue::TYPES then FieldValue.valid?(table_field.data_type, value)
    when "relation" then value.nil? && related_record&.document_id == table_field.relation_table_id
    when "file" then value.is_a?(Integer) && files_in_space?([ value ])
    when "files" then value.is_a?(Array) && value.size <= MAX_FILES && value.all?(Integer) && value.uniq.size == value.size && files_in_space?(value)
    else false
    end
    valid &&= related_record_id.nil? unless table_field.data_type == "relation"
    errors.add(:value, "must match #{table_field.name}'s #{table_field.data_type} type") unless valid
  end
end
