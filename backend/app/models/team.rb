# A named group of people inside a workspace that holds one role there. Every
# person on the team gets that role in the workspace; if they also have their
# own membership, the higher of the two applies (see WorkspaceAccess).
class Team < ApplicationRecord
  # A team can be a viewer, member or admin of a workspace but never an
  # owner: ownership stays with named people.
  ROLES = %w[viewer member admin].freeze

  belongs_to :workspace
  has_many :memberships, class_name: "TeamMembership", dependent: :destroy
  has_many :users, through: :memberships

  enum :role, WorkspaceMembership.roles.slice(*ROLES).symbolize_keys, validate: true

  normalizes :name, with: ->(name) { name.squish }
  validates :name, presence: true, length: { maximum: 80 }, uniqueness: { scope: :workspace_id, case_sensitive: false }
  validate :workspace_is_shared, on: :create

  # The teams a user is on.
  scope :for_user, ->(user) { joins(:memberships).where(team_memberships: { user_id: user.id }) }

  private

  def workspace_is_shared
    errors.add(:base, "A personal space cannot have teams") if workspace&.personal?
  end
end
