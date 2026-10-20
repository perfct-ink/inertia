class Document < ApplicationRecord
  # MySQL rejects a DB-level DEFAULT on JSON columns ("BLOB, TEXT, GEOMETRY
  # or JSON column can't have a default value"), so the {} default that used
  # to live on the column (fine under Postgres' jsonb) has to live here
  # instead.
  attribute :content, default: -> { {} }

  belongs_to :folder
  belongs_to :created_by, class_name: "User"
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

  # nil means "work it out from the tasks" (see FeatureRollup).
  enum :feature_status, { planned: 0, active: 1, done: 2 }, prefix: :feature, scopes: false

  enum :doc_type, { document: 0, spreadsheet: 1, table: 2 }, scopes: false

  validates :title, presence: true
  validates :doc_type, presence: true
  validate :parent_feature_is_valid
  validate :feature_links_in_same_workspace

  before_save :update_content_updated_at, if: :content_changed?

  def workspace_id
    folder&.workspace_id
  end

  private

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
