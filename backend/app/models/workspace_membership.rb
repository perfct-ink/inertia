class WorkspaceMembership < ApplicationRecord
  include RoleCapabilities

  belongs_to :workspace
  belongs_to :user

  # Ordered by privilege: a role can do everything the roles above it in
  # this list (lower number) can.
  enum :role, { viewer: 0, member: 1, admin: 2, owner: 3 }

  # Hours in a week: the most anyone can be allocated or have as capacity.
  MAX_WEEKLY_HOURS = 168

  validates :user_id, uniqueness: { scope: :workspace_id }
  validates :weekly_capacity_hours, numericality: { greater_than_or_equal_to: 0, less_than_or_equal_to: MAX_WEEKLY_HOURS }
  validate :personal_workspace_is_not_shared, on: :create
  before_destroy :keep_an_owner, unless: :destroyed_by_association
  before_update :keep_an_owner_on_demotion
  after_destroy :remove_resource_plan

  private

  def personal_workspace_is_not_shared
    return unless workspace&.personal?
    errors.add(:base, "A personal space cannot be shared") unless user_id == workspace.user_id
  end

  # Someone who leaves a space is no longer planned onto its projects and
  # their time off there goes with them.
  def remove_resource_plan
    workspace.resource_allocations.where(user_id: user_id).delete_all
    workspace.time_offs.where(user_id: user_id).delete_all
  end

  def last_owner?
    owner? && workspace.memberships.owner.where.not(id: id).none?
  end

  def keep_an_owner
    return unless last_owner?
    errors.add(:base, "A space needs at least one owner")
    throw :abort
  end

  def keep_an_owner_on_demotion
    return unless role_changed? && role_was == "owner"
    others = workspace.memberships.owner.where.not(id: id)
    return if others.exists?
    errors.add(:role, "cannot change: a space needs at least one owner")
    throw :abort
  end
end
