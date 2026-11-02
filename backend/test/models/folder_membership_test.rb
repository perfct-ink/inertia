require "test_helper"
require_relative "../support/folder_sharing_setup"

class FolderMembershipTest < ActiveSupport::TestCase
  include FolderSharingSetup

  test "roles are ordered and decide what a person can do" do
    capabilities = FolderMembership.roles.keys.to_h do |role|
      membership = FolderMembership.new(role: role)
      [ role, [ membership.can_comment?, membership.can_write?, membership.can_manage? ] ]
    end
    assert_equal [ false, false, false ], capabilities["viewer"]
    assert_equal [ true, false, false ], capabilities["commenter"]
    assert_equal [ true, true, false ], capabilities["editor"]
    assert_equal [ true, true, true ], capabilities["owner"]
    assert_equal "viewer", FolderMembership.new.role, "an invitation defaults to the least privileged role"
  end

  test "the invitation covers the folder and the folders below it" do
    invite(@guest, :viewer)
    assert_equal "viewer", FolderMembership.effective_for(@guest, @launch).role
    assert_equal "viewer", FolderMembership.effective_for(@guest, @plans).role
    assert_nil FolderMembership.effective_for(@guest, @private)
    assert_nil FolderMembership.effective_for(@stranger, @launch)
  end

  test "the highest role on the folder or above it applies" do
    invite(@guest, :editor)
    invite(@guest, :viewer, @plans)
    assert_equal "editor", FolderMembership.effective_for(@guest, @plans).role

    other = make_user("Other")
    invite(other, :viewer)
    invite(other, :owner, @plans)
    assert_equal "viewer", FolderMembership.effective_for(other, @launch).role
    assert_equal "owner", FolderMembership.effective_for(other, @plans).role
  end

  test "a member of the Space gets no folder role, their Space role applies instead" do
    assert_nil FolderMembership.effective_for(@member, @launch)
  end

  test "reachable folders are the shared ones and everything under them" do
    invite(@guest, :viewer)
    assert_equal [ @launch.id, @plans.id ].sort, FolderMembership.reachable_folder_ids(@guest).sort
    assert_empty FolderMembership.reachable_folder_ids(@stranger)
  end

  test "shared with me lists the top folders only, without archived ones" do
    invite(@guest, :viewer)
    invite(@guest, :editor, @plans)
    assert_equal [ @launch.id ], FolderMembership.top_level_for(@guest).map(&:folder_id)

    @launch.archive!
    assert_empty FolderMembership.top_level_for(@guest)
  end

  test "the Root, a personal Space and a Space member cannot be invited" do
    root = @team.root_folder
    assert_includes root.folder_memberships.build(user: @guest).tap(&:valid?).errors.full_messages.join, "root folder"

    personal = @owner.workspace.folders.create!(name: "Mine")
    assert_includes personal.folder_memberships.build(user: @guest).tap(&:valid?).errors.full_messages, "Folders in a personal Space can't be shared"

    membership = @launch.folder_memberships.build(user: @member)
    assert_not membership.valid?
    assert_includes membership.errors.full_messages.join, "already in this Space"
  end

  test "a person has one role per folder" do
    invite(@guest, :viewer)
    assert_not @launch.folder_memberships.build(user: @guest, role: :editor).valid?
  end

  test "becoming a Space member replaces the invitations in that Space" do
    invite(@guest, :editor)
    other_space = Workspace.create!(name: "Other Space", user: @owner)
    elsewhere = other_space.folders.create!(name: "Elsewhere")
    invite(@guest, :viewer, elsewhere)

    @team.memberships.create!(user: @guest, role: :viewer)

    assert_empty @launch.folder_memberships.where(user: @guest)
    assert_equal 1, elsewhere.folder_memberships.where(user: @guest).count
  end

  test "joining a team replaces the invitations in the team's Space" do
    invite(@guest, :editor)
    team = @team.teams.create!(name: "Designers", role: :viewer)
    team.memberships.create!(user: @guest)
    assert_empty @launch.folder_memberships.where(user: @guest)
  end

  test "deleting a folder removes its invitations" do
    invite(@guest, :viewer)
    invite(@guest, :viewer, @plans)
    assert_difference("FolderMembership.count", -2) { @launch.destroy! }
  end

  test "deleting the person who invited keeps the invitation" do
    inviter = make_user("Inviter")
    membership = @launch.folder_memberships.create!(user: @guest, role: :viewer, invited_by: inviter)
    assert_equal inviter, membership.invited_by

    inviter.destroy!
    assert_nil membership.reload.invited_by
  end
end
