# What a workspace role allows. Included by anything that has a `role`: a
# WorkspaceMembership, or the WorkspaceAccess a user holds in a workspace
# through memberships and teams.
module RoleCapabilities
  # Members and above can change content; viewers only read.
  def can_write?
    role.to_s != "viewer"
  end

  # Admins and owners manage the workspace's members, teams and settings.
  def can_manage?
    %w[admin owner].include?(role.to_s)
  end
end
