# Resolves which workspace a request targets and what the signed-in user may
# do in it. The client names the workspace with the X-Workspace-Id header;
# without it the user's personal workspace is used. A workspace the user
# does not belong to is "not found" (404), never revealed.
#
# A user's role in a workspace is the highest of their own membership and the
# teams they are on (see WorkspaceAccess).
#
# Writes (anything but GET/HEAD) require the member role or above. Lookups
# that start from a record id (documents, tables, shares) search every
# workspace the user belongs to and check the role of the record's own
# workspace with require_write_in!, so they skip the header-based check.
module WorkspaceScoped
  extend ActiveSupport::Concern

  WORKSPACE_HEADER = "X-Workspace-Id".freeze

  included do
    before_action :require_current_workspace_write!, unless: :read_request?
  end

  private

  def current_workspace
    @current_workspace ||= begin
      id = request.headers[WORKSPACE_HEADER].presence
      workspaces = current_user.accessible_workspaces
      id ? workspaces.find(id) : (current_user.workspace || workspaces.order(:id).first!)
    end
  end

  # { workspace_id => WorkspaceAccess } for every workspace the user reaches.
  def workspace_access
    @workspace_access ||= WorkspaceAccess.for(current_user)
  end

  # The user's access (role, can_write?, can_manage?) in the workspace; a
  # workspace they cannot reach is "not found".
  def membership_in(workspace_id)
    workspace_access.fetch(workspace_id.to_i) { raise ActiveRecord::RecordNotFound }
  end

  def accessible_workspace_ids
    workspace_access.keys
  end

  def read_request?
    request.get? || request.head?
  end

  def require_current_workspace_write!
    require_write_in!(current_workspace.id)
  end

  def require_write_in!(workspace_id)
    raise Pundit::NotAuthorizedError unless membership_in(workspace_id).can_write?
  end

  def require_manage_in!(workspace_id)
    raise Pundit::NotAuthorizedError unless membership_in(workspace_id).can_manage?
  end
end
