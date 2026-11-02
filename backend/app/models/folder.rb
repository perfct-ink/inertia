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

  # A project is a folder of docs shown on the Projects screen; a feature
  # folder holds feature requirement docs. Same table, so nesting, sharing
  # and archiving work unchanged.
  enum :kind, { folder: 0, project: 1, feature: 2 }, scopes: false

  # How the folder's Gantt reacts to dependency links on reschedule (PM-14).
  enum :dependency_mode, { none: 0, strict: 1, flexible: 2 }, prefix: :dependencies, scopes: false

  validates :name, presence: true
  before_validation :attach_to_root
  # After attach_to_root: a new folder's parent is needed to pick its slug.
  include Sluggable
  slugged_by :name, within: :parent
  validate :validate_parent
  validate :protect_root_location
  before_destroy :protect_root_deletion, prepend: true

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

  # This folder and everything nested in it as [record, slugs from the Root]
  # pairs, for remembering the old addresses when the folder is renamed or
  # moved (PathAlias).
  def path_entries
    own = path_segments
    [ [ self, own ] ] + descendant_path_entries(own)
  end

  def descendant_path_entries(prefix)
    folder_entries = Folder.where(parent_id: id).flat_map do |child|
      segments = prefix + [ child.slug ]
      [ [ child, segments ] ] + child.descendant_path_entries(segments)
    end
    folder_entries + Document.where(folder_id: id).map { |document| [ document, prefix + [ document.slug ] ] }
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
