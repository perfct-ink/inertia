class Folder < ApplicationRecord
  belongs_to :workspace
  belongs_to :parent, class_name: "Folder", optional: true
  has_many :children, class_name: "Folder", foreign_key: :parent_id, dependent: :destroy
  has_many :documents, dependent: :destroy
  has_many :tasks, dependent: :nullify
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :nullify
  has_many :task_status_settings, dependent: :delete_all
  has_many :shares, as: :shareable, dependent: :destroy
  has_many :resource_allocations, dependent: :destroy
  # Planning records filed under this project (ProjectItem); the database
  # nullifies them when the folder goes.
  has_many :initiatives, dependent: :nullify
  has_many :sprints, dependent: :nullify
  has_many :ideas, dependent: :nullify
  has_many :io_nodes, dependent: :nullify
  has_many :releases, dependent: :nullify
  has_many :objectives, dependent: :nullify

  # A project is a folder of docs shown on the Projects screen; a feature
  # folder holds feature requirement docs. Same table, so nesting, sharing
  # and archiving work unchanged.
  enum :kind, { folder: 0, project: 1, feature: 2 }, scopes: false

  # The pages a project can turn off (docs/features/project_features.md), in
  # sidebar order. Overview and All files are always on. Mirrors
  # PROJECT_FEATURES in frontend/src/data/projectFeature.ts.
  PROJECT_FEATURES = %w[
    my_work tasks task_table pivot calendar events
    roadmap timeline milestones initiatives epics sprints hierarchy
    okrs objectives_map ideas releases resources
  ].freeze

  # How the folder's Gantt reacts to dependency links on reschedule (PM-14).
  enum :dependency_mode, { none: 0, strict: 1, flexible: 2 }, prefix: :dependencies, scopes: false

  validates :name, presence: true
  validates :icon, length: { maximum: 16 }
  validates :image_url, length: { maximum: 2048 }, format: { with: %r{\A(https?://|/)\S*\z}, message: "must be a web address" }, allow_blank: true
  before_validation :attach_to_root
  before_validation :store_all_features_as_default
  validate :validate_parent
  validate :features_are_known
  validate :protect_root_location
  before_destroy :protect_root_deletion, prepend: true

  # The pages this project shows; a project that never chose shows all of them.
  def enabled_features
    features.nil? ? PROJECT_FEATURES : PROJECT_FEATURES & Array(features)
  end

  def root?
    persisted? && workspace.root_folder_id == id
  end

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

  def archived?
    archived_at.present?
  end

  def archive!
    update!(archived_at: Time.current)
  end

  def unarchive!
    update!(archived_at: nil)
  end

  # Folders are recursive "projects/components" — a folder's view covers
  # itself plus everything nested under it, however deep. MySQL 8 can do
  # this with a recursive CTE, but a plain Ruby walk is simpler, avoids raw
  # SQL, and workspace folder trees are small enough that it's not worth
  # the complexity.
  def self_and_descendant_ids
    ids = [ id ]
    children.find_each { |child| ids.concat(child.self_and_descendant_ids) }
    ids
  end

  private

  def attach_to_root
    self.parent_id = workspace.root_folder_id if workspace && parent_id.nil? && !root?
  end

  def validate_parent
    return unless parent
    if parent.workspace_id != workspace_id
      errors.add(:parent, "must belong to the same space")
      return
    end
    visited = Set.new([ id ].compact)
    ancestor = parent
    while ancestor
      if visited.include?(ancestor.id)
        errors.add(:parent, "cannot create a folder cycle")
        break
      end
      visited.add(ancestor.id)
      ancestor = ancestor.parent
    end
  end

  # Every page on is the default, so it is stored as NULL: a page added later
  # then shows in projects that never turned anything off.
  def store_all_features_as_default
    self.features = nil if features.is_a?(Array) && features.uniq.sort == PROJECT_FEATURES.sort
  end

  def features_are_known
    return if features.nil?
    if !features.is_a?(Array) || (features - PROJECT_FEATURES).any?
      errors.add(:features, "can only be #{PROJECT_FEATURES.join(', ')}")
    elsif !project? && will_save_change_to_features?
      errors.add(:features, "can only be set on a project")
    end
  end

  def protect_root_location
    return unless root?
    errors.add(:parent, "cannot move the document root") if parent_id.present?
    errors.add(:archived_at, "cannot archive the document root") if archived_at.present?
    errors.add(:kind, "cannot make the document root a #{kind}") unless folder?
  end

  def protect_root_deletion
    return unless root? && !destroyed_by_association
    errors.add(:base, "The document root cannot be deleted")
    throw :abort
  end
end
