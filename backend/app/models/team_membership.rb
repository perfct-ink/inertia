# One person on a team.
class TeamMembership < ApplicationRecord
  belongs_to :team
  belongs_to :user

  validates :user_id, uniqueness: { scope: :team_id }
  after_create :replace_folder_invitations

  private

  # Joining a team gives a space role, which replaces any folder invitations the
  # person held in that space (see FolderMembership.drop_for_space).
  def replace_folder_invitations
    FolderMembership.drop_for_space(user_id: user_id, workspace_id: team.workspace_id)
  end
end
