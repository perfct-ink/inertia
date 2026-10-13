# Resolves which workspace a request targets and what the signed-in user may
# do in it. The client names the workspace with the X-Workspace-Id header;
# without it the user's personal workspace is used. A workspace the user
# does not belong to is "not found" (404), never revealed.
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

  def membership_in(workspace_id)
    @memberships ||= current_user.workspace_memberships.index_by(&:workspace_id)
    @memberships.fetch(workspace_id.to_i) { raise ActiveRecord::RecordNotFound }
  end

  def accessible_workspace_ids
    current_user.workspace_memberships.pluck(:workspace_id)
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
