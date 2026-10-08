class Document < ApplicationRecord
  # MySQL rejects a DB-level DEFAULT on JSON columns ("BLOB, TEXT, GEOMETRY
  # or JSON column can't have a default value"), so the {} default that used
  # to live on the column (fine under Postgres' jsonb) has to live here
  # instead.
  attribute :content, default: -> { {} }

  belongs_to :folder
  belongs_to :created_by, class_name: "User"
  has_many :tasks, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy

  has_many :table_fields, dependent: :destroy
  has_many :table_records, dependent: :destroy
  has_many :referencing_fields, class_name: "TableField", foreign_key: :relation_table_id, dependent: :restrict_with_error

  enum :doc_type, { document: 0, spreadsheet: 1, table: 2 }, scopes: false

  validates :title, presence: true
  validates :doc_type, presence: true

  before_save :update_content_updated_at, if: :content_changed?

  private

  def update_content_updated_at
    self.content_updated_at = Time.current
  end
end
