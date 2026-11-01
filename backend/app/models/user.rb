class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :validatable,
         :jwt_authenticatable, jwt_revocation_strategy: JwtDenylist

  # The user's own private workspace, created at signup. Other workspaces
  # they belong to come through memberships or teams.
  has_one :workspace, -> { where(personal: true) }, dependent: :destroy
  has_many :workspace_memberships, dependent: :destroy
  has_many :team_memberships, dependent: :destroy
  has_many :teams, through: :team_memberships
  has_many :created_workspaces, -> { where(personal: false) }, class_name: "Workspace", dependent: :restrict_with_error
  has_many :social_identities, dependent: :destroy
  has_many :social_login_attempts, dependent: :destroy
  after_create :create_default_workspace

  validates :name, presence: true

  # Every workspace the user reaches, through their own membership or a team.
  def accessible_workspaces
    Workspace.where(id: workspace_memberships.select(:workspace_id))
             .or(Workspace.where(id: Team.for_user(self).select(:workspace_id)))
  end

  private

  def create_default_workspace
    create_workspace!(name: "#{name}'s Space", personal: true)
  end
end
