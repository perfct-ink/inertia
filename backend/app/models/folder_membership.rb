# A person invited to one folder, with a role that covers everything inside it:
# documents, files, tasks and subfolders. It is for people who are not members
# of the folder's Space; a Space member (directly or through a team) already
# has their Space role, which always wins, so the two never combine.
#
# The role is inherited by subfolders at read time. When someone holds roles on
# a folder and on a folder above it, the highest applies (see .effective_for).
class FolderMembership < ApplicationRecord
  belongs_to :folder
  belongs_to :user
  belongs_to :invited_by, class_name: "User", optional: true

  # Ordered by privilege: a role can do everything the roles before it can.
  # `commenter` reads like a viewer until comments exist (see docs).
  enum :role, { viewer: 0, commenter: 1, editor: 2, owner: 3 }

  validates :user_id, uniqueness: { scope: :folder_id }
  validate :folder_can_be_shared, on: :create
  validate :user_is_not_in_the_space, on: :create

  # Folders in a Space the user is not a member of, shared with them.
  scope :as_guest, lambda { |user|
    where(user_id: user.id).joins(:folder)
      .where.not(folders: { workspace_id: user.accessible_workspaces.select(:id) })
  }

  # Whether a folder may be shared with named people at all. The Space's Root
  # would hand over the whole Space (invite them to the Space instead), and a
  # personal Space is private by design.
  def self.shareable?(folder)
    !folder.root? && !folder.workspace.personal?
  end

  # The membership that gives the user the most access to the folder: their own
  # on it or on any folder above it, the highest role winning. Nil for someone
  # with no such membership and for a member of the folder's Space (their Space
  # role applies instead).
  def self.effective_for(user, folder)
    return if user.nil? || folder.nil?
    return if user.accessible_workspaces.exists?(folder.workspace_id)
    where(user_id: user.id, folder_id: folder.self_and_ancestor_ids).max_by { |membership| roles.fetch(membership.role) }
  end

  # Every folder the user reaches only through folder memberships: each shared
  # folder and everything below it.
  def self.reachable_folder_ids(user)
    as_guest(user).preload(:folder).flat_map { |membership| membership.folder.self_and_descendant_ids }.uniq
  end

  # The folders to list under "Shared with me": the active shared folders that
  # are not already inside another folder shared with the same user.
  def self.top_level_for(user)
    memberships = as_guest(user).preload(:invited_by, folder: :workspace).to_a
    shared_ids = memberships.to_set(&:folder_id)
    memberships.reject do |membership|
      membership.folder.archived? || (membership.folder.self_and_ancestor_ids - [ membership.folder_id ]).any? { |id| shared_ids.include?(id) }
    end.sort_by { |membership| membership.folder.name.downcase }
  end

  # Called when someone gains access to a Space (a membership or a team): what
  # they were invited to in it is replaced by their Space role, so leaving the
  # Space later cannot leave folder access behind.
  def self.drop_for_space(user_id:, workspace_id:)
    where(user_id: user_id, folder_id: Folder.where(workspace_id: workspace_id).select(:id)).delete_all
  end

  # Anyone with a role can read and, from commenter up, comment.
  def can_comment?
    !viewer?
  end

  # Editors and owners change what is in the folder.
  def can_write?
    editor? || owner?
  end

  # Owners invite people, change their roles and remove them.
  def can_manage?
    owner?
  end

  private

  def folder_can_be_shared
    return unless folder
    errors.add(:base, "The Space's root folder can't be shared; invite the person to the Space instead") if folder.root?
    errors.add(:base, "Folders in a personal Space can't be shared") if folder.workspace.personal?
  end

  def user_is_not_in_the_space
    return unless user && folder
    errors.add(:base, "#{user.name} is already in this Space, so they can already open this folder") if user.accessible_workspaces.exists?(folder.workspace_id)
  end
end
