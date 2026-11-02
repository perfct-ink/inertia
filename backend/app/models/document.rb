class Document < ApplicationRecord
  # MySQL rejects a DB-level DEFAULT on JSON columns ("BLOB, TEXT, GEOMETRY
  # or JSON column can't have a default value"), so the {} default that used
  # to live on the column (fine under Postgres' jsonb) has to live here
  # instead.
  attribute :content, default: -> { {} }

  belongs_to :folder
  # An uploaded file of any type is a document of its own (doc_type: file).
  has_one_attached :file
  belongs_to :created_by, class_name: "User"
  has_many :tasks, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy

  has_many :table_fields, dependent: :destroy
  has_many :table_records, dependent: :destroy
  has_many :referencing_fields, class_name: "TableField", foreign_key: :relation_table_id, dependent: :restrict_with_error

  enum :doc_type, { document: 0, spreadsheet: 1, table: 2, file: 3 }, scopes: false

  validates :title, presence: true
  validates :doc_type, presence: true
  validate :file_documents_have_a_file

  before_save :update_content_updated_at, if: :content_changed?

  MAX_FILE_SIZE = 100.megabytes

  private

  def file_documents_have_a_file
    return unless doc_type == "file"
    if !file.attached?
      errors.add(:file, "must be attached")
    elsif file.blob.byte_size > MAX_FILE_SIZE
      errors.add(:file, "is too large (limit #{MAX_FILE_SIZE / 1.megabyte} MB)")
    end
  end

  def update_content_updated_at
    self.content_updated_at = Time.current
  end
end
