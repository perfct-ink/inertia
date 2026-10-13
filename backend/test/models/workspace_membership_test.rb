require "test_helper"

class WorkspaceMembershipTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "ws-owner@example.com", password: "password123")
    @other = User.create!(name: "Other", email: "ws-other@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
  end

  test "signup creates a personal workspace owned by the user" do
    assert @owner.workspace.personal?
    assert @owner.workspace.memberships.find_by!(user: @owner).owner?
  end

  test "creating a workspace makes its creator an owner" do
    assert_not @team.personal?
    assert @team.memberships.find_by!(user: @owner).owner?
    assert_includes @owner.accessible_workspaces, @team
  end

  test "roles decide who can write and who can manage" do
    viewer = WorkspaceMembership.new(role: :viewer)
    member = WorkspaceMembership.new(role: :member)
    admin = WorkspaceMembership.new(role: :admin)
    assert_not viewer.can_write?
    assert member.can_write?
    assert_not member.can_manage?
    assert admin.can_write?
    assert admin.can_manage?
  end

  test "a personal workspace cannot be shared" do
    membership = @owner.workspace.memberships.build(user: @other, role: :member)
    assert_not membership.valid?
    assert_includes membership.errors.full_messages, "A personal workspace cannot be shared"
  end

  test "a workspace keeps at least one owner" do
    only_owner = @team.memberships.find_by!(user: @owner)
    assert_not only_owner.destroy
    assert_not only_owner.update(role: :admin)

    @team.memberships.create!(user: @other, role: :owner)
    assert only_owner.update(role: :admin)
  end

  test "a personal workspace cannot be deleted but goes away with its user" do
    personal = @other.workspace
    root_id = personal.root_folder_id
    assert_not personal.destroy
    assert_equal root_id, personal.root_folder_id
    assert_equal root_id, personal.reload.root_folder_id
    assert_nothing_raised { @other.destroy! }
    assert_not Workspace.exists?(personal.id)
  end

  test "a user cannot be deleted while they created a shared workspace" do
    assert_not @owner.destroy
    assert User.exists?(@owner.id)
  end
end
