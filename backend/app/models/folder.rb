class Folder < ApplicationRecord
  include PlanningHealth

  belongs_to :workspace
  belongs_to :parent, class_name: "Folder", optional: true
  belongs_to :home_document, class_name: "Document", optional: true
  belongs_to :owner, class_name: "User", optional: true
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
  has_many :objectives, dependent: :nullify
  has_many :baselines, dependent: :destroy

  # A project is a folder of docs shown on the Projects screen; a feature
  # folder holds feature requirement docs. Same table, so nesting, sharing
  # and archiving work unchanged.
  enum :kind, { folder: 0, project: 1, feature: 2 }, scopes: false

  # How the folder's Gantt reacts to dependency links on reschedule (PM-14).
  enum :dependency_mode, { none: 0, strict: 1, flexible: 2 }, prefix: :dependencies, scopes: false

  # Lifecycle of a project (only meaningful when kind is project).
  enum :project_status, { planned: 0, active: 1, on_hold: 2, done: 3 }, prefix: :status, scopes: false

  validates :name, presence: true
  validates :icon, length: { maximum: 16 }
  validates :image_url, length: { maximum: 2048 }, format: { with: %r{\A(https?://|/)\S*\z}, message: "must be a web address" }, allow_blank: true
  validate :home_document_is_in_this_folder
  validate :owner_is_a_member
  validate :target_date_not_before_start_date
  before_validation :attach_to_root
  validate :validate_parent
  validate :protect_root_location
  before_destroy :protect_root_deletion, prepend: true

  def root?
    persisted? && workspace.root_folder_id == id
  end

  scope :active, -> { where(archived_at: nil) }
  scope :archived, -> { where.not(archived_at: nil) }

  # Tasks that sit in this folder, its subfolders, or documents inside them:
  # what the folder's Gantt draws.
  def scheduled_tasks
    folder_ids = self_and_descendant_ids
    workspace.tasks.where("tasks.folder_id IN (?) OR tasks.document_id IN (?)", folder_ids, Document.where(folder_id: folder_ids).select(:id))
  end

  # Tasks that sit in this folder, its subfolders, or documents inside them:
  # what the folder's Gantt and rollups cover.
  def scheduled_tasks
    folder_ids = self_and_descendant_ids
    workspace.tasks.where("tasks.folder_id IN (?) OR tasks.document_id IN (?)", folder_ids, Document.where(folder_id: folder_ids).select(:id))
  end

  # PlanningHealth asks whether the work is finished.
  def done? = status_done?

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

  def home_document_is_in_this_folder
    return if home_document.nil? || home_document.folder_id == id
    errors.add(:home_document, "must be a document in this folder")
  end

  def owner_is_a_member
    return if owner_id.blank? || workspace.nil?
    errors.add(:owner, "must be a member of the space") unless workspace.memberships.exists?(user_id: owner_id)
  end

  def target_date_not_before_start_date
    return unless start_date && target_date
    errors.add(:target_date, "can't be before the start date") if target_date < start_date
  end

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
