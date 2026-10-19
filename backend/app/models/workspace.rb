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

  # The optional sections a Space can turn off (docs/features/space_features.md).
  FEATURES = %w[events epics initiatives milestones sprints okrs roadmap hierarchy].freeze

  validates :name, presence: true
  validate :features_are_known
  after_create :add_creator_as_owner
  after_create :ensure_document_root!
  before_destroy :prepare_destroy, prepend: true

  # The sections this Space shows; a Space that never chose shows all of them.
  def enabled_features
    features.nil? ? FEATURES : FEATURES & Array(features)
  end

  def feature_enabled?(name)
    enabled_features.include?(name.to_s)
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

  def features_are_known
    return if features.nil?
    unless features.is_a?(Array) && (features - FEATURES).empty?
      errors.add(:features, "can only be #{FEATURES.join(', ')}")
    end
  end

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
