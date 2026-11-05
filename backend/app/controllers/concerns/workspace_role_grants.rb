# Only an owner may grant, change or revoke the owner role. Controllers that
# include this set @workspace.
module WorkspaceRoleGrants
  private

  def authorize_role_grant!(role)
    raise Pundit::NotAuthorizedError if role.to_s == "owner" && !membership_in(@workspace.id).owner?
  end
end
