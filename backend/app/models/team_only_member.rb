# A person who reaches a workspace only through teams: they have no membership
# of their own, so there is no membership row to change or remove (a team
# admin manages them from the team). Their role is the highest of their teams'
# roles, the same rule WorkspaceAccess applies. A plain object listing them
# for one workspace in a few queries.
class TeamOnlyMember
  attr_reader :user, :teams

  def initialize(user:, teams:)
    @user = user
    @teams = teams.sort_by { |team| team.name.downcase }
  end

  def role
    WorkspaceAccess.highest(teams.map(&:role))
  end

  # Everyone on a team of the workspace who has no direct membership there,
  # ordered by name.
  def self.in(workspace)
    TeamMembership.joins(:team).preload(:user, :team)
                  .where(teams: { workspace_id: workspace.id })
                  .where.not(user_id: workspace.memberships.select(:user_id))
                  .group_by(&:user_id)
                  .values
                  .map { |rows| new(user: rows.first.user, teams: rows.map(&:team)) }
                  .sort_by { |member| member.user.name.downcase }
  end
end
