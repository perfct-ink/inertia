class TableCell < ApplicationRecord
  belongs_to :table_record
  belongs_to :table_field
  belongs_to :related_record, class_name: "TableRecord", optional: true
  validates :table_field_id, uniqueness: { scope: :table_record_id }
  before_validation :store_plain_value
  validate :valid_value

  MAX_FILES = 50

  private

  # Whatever was typed or imported is stored as the plain value of its type
  # (a phone as digits, money as a number); the field's format only shows it.
  def store_plain_value
    self.value = table_field.plain_value(value) if table_field
  end

  # Whether the Space of the collection lets this user in.
  def person_in_space?(user_id)
    table_field.document.folder.workspace.accessible_by?(user_id)
  end

  # Every id is an uploaded file item in the same Space as the collection.
  def files_in_space?(ids)
    return true if ids.empty?
    workspace_id = table_field.document.folder.workspace_id
    Document.joins(:folder).where(id: ids, doc_type: :file, folders: { workspace_id: workspace_id }).count == ids.size
  end

  def valid_value
    return unless table_field && table_record
    errors.add(:table_field, "must belong to this collection") unless table_field.document_id == table_record.document_id
    type = table_field.data_type
    valid = FieldType.stored?(type) && FieldType.valid?(type, value, options: table_field.options || [])
    valid &&= related_record&.document_id == table_field.relation_table_id if type == "relation"
    valid &&= files_in_space?(Array(value)) if type == "file" || type == "files"
    valid &&= value.size <= MAX_FILES && value.uniq.size == value.size if type == "files"
    valid &&= person_in_space?(value) if type == "person"
    valid &&= related_record_id.nil? unless table_field.data_type == "relation"
    errors.add(:value, "must match #{table_field.name}'s #{table_field.data_type} type") unless valid
  end
end
