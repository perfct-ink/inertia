class WorkspaceMembership < ApplicationRecord
  belongs_to :workspace
  belongs_to :user

  # Ordered by privilege: a role can do everything the roles above it in
  # this list (lower number) can.
  enum :role, { viewer: 0, member: 1, admin: 2, owner: 3 }

  validates :user_id, uniqueness: { scope: :workspace_id }
  validate :personal_workspace_is_not_shared, on: :create
  before_destroy :keep_an_owner, unless: :destroyed_by_association
  before_update :keep_an_owner_on_demotion

  # Members and above can change content; viewers only read.
  def can_write?
    !viewer?
  end

  # Admins and owners manage the workspace's members and settings.
  def can_manage?
    admin? || owner?
  end

  private

  def personal_workspace_is_not_shared
    return unless workspace&.personal?
    errors.add(:base, "A personal workspace cannot be shared") unless user_id == workspace.user_id
  end

  def last_owner?
    owner? && workspace.memberships.owner.where.not(id: id).none?
  end

  def keep_an_owner
    return unless last_owner?
    errors.add(:base, "A workspace needs at least one owner")
    throw :abort
  end

  def keep_an_owner_on_demotion
    return unless role_changed? && role_was == "owner"
    others = workspace.memberships.owner.where.not(id: id)
    return if others.exists?
    errors.add(:role, "cannot change: a workspace needs at least one owner")
    throw :abort
  end
end
