# What a signed-in user may do with folders, documents and tasks that sit in a
# Space they are NOT a member of but have been invited into (a FolderMembership).
# Include after WorkspaceScoped. Space members keep going through their Space
# role: every lookup here tries the member path first and falls back to shared
# folders only when it finds nothing, so members' behaviour is unchanged.
#
# A folder, document or task the user has no access to at all is "not found"
# (404), never revealed. One they can read but not change is "forbidden" (403).
module FolderCollaboration
  extend ActiveSupport::Concern

  # The only task fields a person invited to a folder may set. Everything that
  # points elsewhere in the Space (epic, sprint, milestone, parent, assignee,
  # folder) stays with Space members.
  SHARED_TASK_ATTRIBUTES = %i[title description status start_date due_date position].freeze

  private

  def space_member_of?(workspace_id)
    accessible_workspace_ids.include?(workspace_id)
  end

  # Ids of the folders (and everything below them) the user reaches only
  # through an invitation.
  def shared_folder_ids
    @shared_folder_ids ||= FolderMembership.reachable_folder_ids(current_user)
  end

  def find_shared_folder(id)
    Folder.where(id: shared_folder_ids).find(id)
  end

  # A folder of the active Space, or else one shared with the user.
  def find_folder_or_shared(id)
    current_workspace.folders.find_by(id: id) || find_shared_folder(id)
  end

  # A folder in any Space the user belongs to, or else one shared with them.
  def find_accessible_folder(id)
    Folder.where(workspace_id: accessible_workspace_ids).find_by(id: id) || find_shared_folder(id)
  end

  # A document (optionally narrowed by `scope`, e.g. only collections) in any
  # Space the user belongs to, or else one in a folder shared with them.
  def find_accessible_document(id, scope = Document.all)
    scope = scope.joins(:folder)
    scope.where(folders: { workspace_id: accessible_workspace_ids }).find_by(id: id) ||
      scope.where(folder_id: shared_folder_ids).find(id)
  end

  def shared_tasks
    Task.where(folder_id: shared_folder_ids)
      .or(Task.where(document_id: Document.where(folder_id: shared_folder_ids).select(:id)))
  end

  def can_read_folder?(folder)
    space_member_of?(folder.workspace_id) || FolderMembership.effective_for(current_user, folder).present?
  end

  # In a Space the user belongs to: their Space role (member or above). In a
  # shared folder: an editor or owner invitation.
  def can_write_folder?(folder)
    if space_member_of?(folder.workspace_id)
      membership_in(folder.workspace_id).can_write?
    else
      FolderMembership.effective_for(current_user, folder)&.can_write? || false
    end
  end

  # Inviting people, changing their roles, removing them: admins and owners of
  # the Space, or an owner invitation. Never for Root or a personal Space.
  def can_manage_folder?(folder)
    return false unless FolderMembership.shareable?(folder)
    if space_member_of?(folder.workspace_id)
      membership_in(folder.workspace_id).can_manage?
    else
      FolderMembership.effective_for(current_user, folder)&.can_manage? || false
    end
  end

  def require_folder_write!(folder)
    raise Pundit::NotAuthorizedError unless can_write_folder?(folder)
  end

  def require_folder_manage!(folder)
    raise Pundit::NotAuthorizedError unless can_manage_folder?(folder)
  end

  # How the user holds this folder, for the folder page: where the access
  # comes from, the role, and what the screen may offer.
  def folder_access_json(folder)
    if space_member_of?(folder.workspace_id)
      { source: "space", role: membership_in(folder.workspace_id).role,
        can_write: can_write_folder?(folder), can_share: can_manage_folder?(folder) }
    else
      membership = FolderMembership.effective_for(current_user, folder)
      { source: "folder", role: membership&.role, can_write: can_write_folder?(folder), can_share: can_manage_folder?(folder) }
    end
  end
end
