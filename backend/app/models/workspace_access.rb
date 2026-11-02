# What one user may do in one workspace: the highest role they hold there,
# either through their own membership or through a team they are on. (Teams
# never grant owner, so ownership always comes from a membership.) A plain
# object, built for every workspace the user reaches in two queries.
class WorkspaceAccess
  include RoleCapabilities

  attr_reader :workspace_id, :role

  def initialize(workspace_id:, role:)
    @workspace_id = workspace_id
    @role = role.to_s
  end

  # viewer?, member?, admin?, owner? as on WorkspaceMembership.
  WorkspaceMembership.roles.each_key do |name|
    define_method(:"#{name}?") { role == name }
  end

  # { workspace_id => WorkspaceAccess } for every workspace the user reaches.
  def self.for(user)
    grants = user.workspace_memberships.map { |membership| [ membership.workspace_id, membership.role ] }
    grants += Team.for_user(user).map { |team| [ team.workspace_id, team.role ] }
    grants.group_by(&:first).to_h do |workspace_id, pairs|
      [ workspace_id, new(workspace_id: workspace_id, role: highest(pairs.map(&:last))) ]
    end
  end

  # The most privileged of the given role names.
  def self.highest(roles)
    roles.max_by { |name| WorkspaceMembership.roles.fetch(name.to_s) }
  end
end
