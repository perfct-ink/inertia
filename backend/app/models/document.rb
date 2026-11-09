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
  belongs_to :initiative, optional: true
  # Feature fields (docs/features/feature_hierarchy.md): only meaningful for documents in a feature folder.
  belongs_to :parent_feature, class_name: "Document", optional: true
  has_many :sub_features, class_name: "Document", foreign_key: :parent_feature_id, dependent: :nullify, inverse_of: :parent_feature
  belongs_to :feature_owner, class_name: "User", optional: true
  belongs_to :epic, optional: true
  belongs_to :milestone, optional: true
  has_many :tasks, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy

  has_many :table_fields, dependent: :destroy
  has_many :table_records, dependent: :destroy
  has_many :referencing_fields, class_name: "TableField", foreign_key: :relation_table_id, dependent: :restrict_with_error

  enum :doc_type, { document: 0, spreadsheet: 1, table: 2, file: 3 }, scopes: false
  # nil means "work it out from the tasks" (see FeatureRollup).
  enum :feature_status, { planned: 0, active: 1, done: 2 }, prefix: :feature, scopes: false


  validates :title, presence: true
  validates :doc_type, presence: true
  validate :file_documents_have_a_file
  validate :initiative_in_same_workspace
  validate :parent_feature_is_valid
  validate :feature_links_in_same_workspace

  include Sluggable
  slugged_by :title, within: :folder

  before_save :update_content_updated_at, if: :content_changed?
  # A deleted file leaves any collection file fields that held it.
  before_destroy :remove_from_collection_cells, if: -> { doc_type == "file" }

  MAX_FILE_SIZE = 100.megabytes

  def workspace_id
    folder&.workspace_id
  end

  # The headings a link can point at (see DocumentHeadings); only text documents
  # have any, a sheet, Collection or uploaded file has none.
  def headings
    doc_type == "document" ? DocumentHeadings.of(content) : []
  end

  # Moving a document out of a folder ends its time as that folder's home page.
  after_update { Folder.where(home_document_id: id).where.not(id: folder_id).update_all(home_document_id: nil) if saved_change_to_folder_id? }

  private

  def remove_from_collection_cells
    TableCell.joins(:table_field).where(table_fields: { data_type: %w[file files] }).find_each do |cell|
      case cell.value
      when Integer then cell.destroy! if cell.value == id
      when Array
        remaining = cell.value - [ id ]
        next if remaining.size == cell.value.size
        remaining.empty? ? cell.destroy! : cell.update!(value: remaining)
      end
    end
  end

  def file_documents_have_a_file
    return unless doc_type == "file"
    if !file.attached?
      errors.add(:file, "must be attached")
    elsif file.blob.byte_size > MAX_FILE_SIZE
      errors.add(:file, "is too large (limit #{MAX_FILE_SIZE / 1.megabyte} MB)")
    end
  end

  def initiative_in_same_workspace
    return if initiative.nil? || folder.nil? || initiative.workspace_id == folder.workspace_id
    errors.add(:initiative, "must belong to the same space")
  end

  # A feature nests under another feature of the same Space, never under itself
  # or one of its own sub-features.
  def parent_feature_is_valid
    return if parent_feature.nil?
    errors.add(:parent_feature, "must be in the same space") if parent_feature.workspace_id != workspace_id
    ancestor = parent_feature
    seen = []
    while ancestor
      if ancestor.id == id && id
        errors.add(:parent_feature, "can't be the feature itself or one of its sub-features")
        break
      end
      break if seen.include?(ancestor.id)
      seen << ancestor.id
      ancestor = ancestor.parent_feature
    end
  end

  def feature_links_in_same_workspace
    errors.add(:epic, "must be in the same space") if epic && epic.workspace_id != workspace_id
    errors.add(:milestone, "must be in the same space") if milestone && milestone.workspace_id != workspace_id
    return if feature_owner_id.blank? || folder.nil?
    errors.add(:feature_owner, "must be a member of the space") unless folder.workspace.memberships.exists?(user_id: feature_owner_id)
  end

  def update_content_updated_at
    self.content_updated_at = Time.current
  end
end
