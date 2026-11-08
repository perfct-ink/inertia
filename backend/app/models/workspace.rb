class Workspace < ApplicationRecord
  # The creator (and first owner). Access is through memberships, not this column.
  belongs_to :user
  has_many :memberships, class_name: "WorkspaceMembership", dependent: :destroy
  has_many :members, through: :memberships, source: :user
  has_many :teams, dependent: :destroy
  has_many :invitations, class_name: "WorkspaceInvitation", dependent: :destroy
  belongs_to :root_folder, class_name: "Folder", optional: true
  # Before folders: the settings point at both.
  has_many :task_status_settings, dependent: :delete_all
  has_many :folders, dependent: :destroy
  has_many :documents, through: :folders
  has_many :path_aliases, dependent: :delete_all
  has_many :task_dependencies, dependent: :delete_all
  has_many :tasks, dependent: :destroy
  has_many :task_fields, dependent: :destroy
  has_many :ai_workers, dependent: :destroy
  has_many :ai_runs, dependent: :destroy
  has_many :events, dependent: :destroy
  has_many :epics, dependent: :destroy
  has_many :initiatives, dependent: :destroy
  has_many :shares, as: :shareable, dependent: :destroy
  has_many :ideas, dependent: :destroy
  has_many :io_nodes, dependent: :destroy
  has_many :baselines, dependent: :destroy
  has_many :milestones, dependent: :destroy
  has_many :sprints, dependent: :destroy
  has_many :objectives, dependent: :destroy
  has_many :resource_allocations, dependent: :destroy
  has_many :project_requests, dependent: :destroy
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
        # update_all skips callbacks, so the adopted folders get their URL slugs here.
        folders.where(parent_id: root.id, slug: nil).find_each(&:save!)
        update!(root_folder: root)
      end
      root_folder
    end
  end

  # Whether the user has any role here, through their own membership or a team.
  def accessible_by?(user_id)
    memberships.exists?(user_id: user_id) ||
      TeamMembership.joins(:team).exists?(user_id: user_id, teams: { workspace_id: id })
  end

  # The public read-only roadmap link, if one has been made.
  def roadmap_share
    shares.first
  end


  # Everyone who can open the Space: its members and the people on its teams.
  def person_ids
    (memberships.pluck(:user_id) + TeamMembership.joins(:team).where(teams: { workspace_id: id }).pluck(:user_id)).uniq
  end

  # Whether anyone besides one person can open the Space, and so its projects.
  def shared?
    person_ids.size > 1
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
