require "test_helper"

class WorkspaceInvitationTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "owner-inv@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
  end

  test "an invitation gets a token, a normalized email and defaults to member" do
    invitation = @team.invitations.create!(email: "  New@Example.COM ", invited_by: @owner)
    assert_equal "new@example.com", invitation.email
    assert invitation.token.present?
    assert_equal "member", invitation.role
    assert invitation.pending?
  end

  test "bad emails, duplicates, existing members and personal Spaces are rejected" do
    assert_not @team.invitations.build(email: "nope").valid?

    @team.invitations.create!(email: "dup@example.com")
    assert_not @team.invitations.build(email: "DUP@example.com").valid?

    assert_not @team.invitations.build(email: @owner.email).valid?
    assert_not @owner.workspace.invitations.build(email: "x@example.com").valid?
    assert_not @team.invitations.build(email: "x@example.com", role: "emperor").valid?
  end

  test "accepting adds the signed-in invitee with the invited role, once" do
    invitation = @team.invitations.create!(email: "ada-inv@example.com", role: "admin")
    ada = User.create!(name: "Ada", email: "ada-inv@example.com", password: "password123")

    membership = invitation.accept!(ada)
    assert membership.admin?
    assert_not invitation.reload.pending?
    assert_includes @team.members, ada
    assert_raises(ActiveRecord::RecordNotFound) { invitation.accept!(ada) }
  end

  test "someone with a different email cannot use the link" do
    invitation = @team.invitations.create!(email: "ada-inv2@example.com")
    other = User.create!(name: "Bo", email: "bo-inv2@example.com", password: "password123")
    assert_raises(ActiveRecord::RecordNotFound) { invitation.accept!(other) }
    assert invitation.reload.pending?
    assert_not_includes @team.members, other
  end
end
