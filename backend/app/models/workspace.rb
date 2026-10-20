class Workspace < ApplicationRecord
  # The creator (and first owner). Access is through memberships, not this column.
  belongs_to :user
  has_many :memberships, class_name: "WorkspaceMembership", dependent: :destroy
  has_many :members, through: :memberships, source: :user
  belongs_to :root_folder, class_name: "Folder", optional: true
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :task_dependencies, dependent: :delete_all
  has_many :tasks, dependent: :destroy
  has_many :ai_workers, dependent: :destroy
  has_many :ai_runs, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :milestones, dependent: :destroy
  has_many :sprints, dependent: :destroy
  has_many :objectives, dependent: :destroy
  has_many :quip_imports, dependent: :destroy

  # Uploaded files per Space, unless storage_limit_bytes says otherwise.
  DEFAULT_STORAGE_LIMIT = 1.gigabyte

  validates :name, presence: true
  validates :storage_limit_bytes, numericality: { only_integer: true, greater_than_or_equal_to: 0, allow_nil: true }
  after_create :add_creator_as_owner
  after_create :ensure_document_root!
  before_destroy :prepare_destroy, prepend: true

  def storage_limit
    storage_limit_bytes || DEFAULT_STORAGE_LIMIT
  end

  # Bytes taken by the Space's uploaded file items.
  def storage_used
    ActiveStorage::Attachment.joins(:blob)
      .where(record_type: "Document", name: "file", record_id: Document.where(doc_type: :file, folder_id: folders.select(:id)).select(:id))
      .sum("active_storage_blobs.byte_size")
  end

  # Whether `bytes` more would still fit within the limit.
  def storage_room_for?(bytes)
    storage_used + bytes <= storage_limit
  end

  def ensure_document_root!
    return root_folder if root_folder_id.present?

    with_lock do
      unless root_folder_id.present?
        root = folders.create!(name: "Root", position: 0)
        folders.where(parent_id: nil).where.not(id: root.id).update_all(parent_id: root.id)
        update!(root_folder: root)
      end
      root_folder
    end
  end

  private

  def prepare_destroy
    protect_personal
    clear_root_reference
  end

  def add_creator_as_owner
    memberships.create!(user: user, role: :owner)
  end

  def protect_personal
    return unless personal? && !destroyed_by_association
    errors.add(:base, "A personal space cannot be deleted")
    throw :abort
  end

  def clear_root_reference
    update_column(:root_folder_id, nil) if root_folder_id.present?
  end
end
