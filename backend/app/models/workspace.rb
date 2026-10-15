class Workspace < ApplicationRecord
  # The creator (and first owner). Access is through memberships, not this column.
  belongs_to :user
  has_many :memberships, class_name: "WorkspaceMembership", dependent: :destroy
  has_many :members, through: :memberships, source: :user
  belongs_to :root_folder, class_name: "Folder", optional: true
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :tasks, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :milestones, dependent: :destroy
  has_many :quip_imports, dependent: :destroy

  validates :name, presence: true
  after_create :add_creator_as_owner
  after_create :ensure_document_root!
  before_destroy :prepare_destroy, prepend: true

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
