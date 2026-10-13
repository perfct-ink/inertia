class Workspace < ApplicationRecord
  belongs_to :user
  belongs_to :root_folder, class_name: "Folder", optional: true
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :tasks, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :quip_imports, dependent: :destroy

  validates :name, presence: true
  after_create :ensure_document_root!
  before_destroy :clear_root_reference, prepend: true

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

  def clear_root_reference
    update_column(:root_folder_id, nil) if root_folder_id.present?
  end
end
