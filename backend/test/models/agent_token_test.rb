require "test_helper"

class AgentTokenTest < ActiveSupport::TestCase
  setup do
    @user = User.create!(name: "Pat", email: "pat-agent@example.com", password: "password123")
    @workspace = @user.workspace
  end

  test "issuing returns the plain token once and stores only a digest" do
    token, plain = AgentToken.issue!(workspace: @workspace, name: "Claude Code", created_by: @user)
    assert plain.start_with?(AgentToken::PREFIX)
    assert_not_includes token.attributes.values.map(&:to_s), plain
    assert_equal plain.first(AgentToken::PREFIX.size + 6), token.token_prefix
    assert_equal token, AgentToken.authenticate(plain)
  end

  test "a revoked, unknown or malformed token does not authenticate" do
    token, plain = AgentToken.issue!(workspace: @workspace, name: "A")
    token.revoke!
    assert_nil AgentToken.authenticate(plain)
    assert_nil AgentToken.authenticate("inertia_agent_nope")
    assert_nil AgentToken.authenticate("some-jwt")
    assert_nil AgentToken.authenticate(nil)
  end

  test "read tokens cannot write, write tokens can" do
    read, = AgentToken.issue!(workspace: @workspace, name: "R")
    write, = AgentToken.issue!(workspace: @workspace, name: "W", permission: :write)
    assert_not read.writable?
    assert write.writable?
  end

  test "a folder scope covers that folder and what is under it only" do
    inside = @workspace.folders.create!(name: "Inside")
    sub = @workspace.folders.create!(name: "Sub", parent: inside)
    outside = @workspace.folders.create!(name: "Outside")
    token, = AgentToken.issue!(workspace: @workspace, name: "Scoped", folder: inside)
    assert token.covers_folder?(inside.id)
    assert token.covers_folder?(sub.id)
    assert_not token.covers_folder?(outside.id)
    assert_equal [ inside.id, sub.id ].sort, token.folder_ids.sort

    doc = Document.create!(title: "D", folder: outside, created_by: @user)
    assert_not token.covers_document?(doc)
  end

  test "the folder must be in the same space and a name is required" do
    other = User.create!(name: "O", email: "o-agent@example.com", password: "password123")
    assert_raises(ActiveRecord::RecordInvalid) { AgentToken.issue!(workspace: @workspace, name: "X", folder: other.workspace.folders.create!(name: "F")) }
    assert_raises(ActiveRecord::RecordInvalid) { AgentToken.issue!(workspace: @workspace, name: "") }
  end
end
