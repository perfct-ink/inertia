require "test_helper"
require_relative "../support/agent_access"

class AgentTokenTest < ActiveSupport::TestCase
  include AgentAccess

  setup { build_agent_space }

  test "only a digest is stored, and the token authenticates until it is revoked" do
    token, plain = issue_agent_token
    assert plain.start_with?(AgentToken::PREFIX)
    assert_equal AgentToken.digest(plain), token.token_digest
    assert_not_includes token.attributes.values.map(&:to_s), plain
    assert_not_equal plain, token.token_prefix
    assert plain.start_with?(token.token_prefix)

    assert_equal token, AgentToken.authenticate(plain)
    token.revoke!
    assert_nil AgentToken.authenticate(plain)
  end

  test "revoking is immediate and keeps the first revocation time" do
    token, plain = issue_agent_token
    assert AgentToken.authenticate(plain)
    token.revoke!
    first = token.reload.revoked_at
    assert_nil AgentToken.authenticate(plain)
    token.revoke!
    assert_equal first, token.reload.revoked_at
  end

  test "unknown, blank and oversized strings are all just nil" do
    _token, plain = issue_agent_token
    assert_nil AgentToken.authenticate(nil)
    assert_nil AgentToken.authenticate("")
    assert_nil AgentToken.authenticate("inertia_agent_nope")
    assert_nil AgentToken.authenticate(plain.sub(AgentToken::PREFIX, ""))
    assert_nil AgentToken.authenticate(plain + ("x" * 200))
    assert_nil AgentToken.authenticate(plain.upcase)
  end

  test "only an owner of the space can make a token" do
    member = create_agent_user("member")
    admin = create_agent_user("admin")
    @space.memberships.create!(user: member, role: :member)
    @space.memberships.create!(user: admin, role: :admin)

    [ member, admin, @stranger, nil ].each do |person|
      assert_raises(ActiveRecord::RecordInvalid) { issue_agent_token(by: person) }
    end
    assert_equal 0, AgentToken.count
  end

  test "a token stops working when its creator is no longer an owner" do
    second = create_agent_user("second")
    @space.memberships.create!(user: second, role: :owner)
    _token, plain = issue_agent_token
    assert AgentToken.authenticate(plain)

    @space.memberships.find_by!(user: @owner).update!(role: :admin)
    assert_nil AgentToken.authenticate(plain)
  end

  test "a token for a folder reaches that folder and what is under it, nothing else" do
    token, = issue_agent_token(folder: @plans)
    assert_equal [ @plans.id, @drafts.id ].sort, token.folder_ids.sort
    assert token.covers_folder?(@drafts.id)
    assert_not token.covers_folder?(@other_folder.id)
    assert_not token.covers_folder?(@elsewhere_folder.id)

    inside = make_document(@drafts, "Inside")
    outside = make_document(@other_folder, "Outside")
    assert_equal [ inside ], token.documents.to_a
    assert token.covers_document?(inside)
    assert_not token.covers_document?(outside)
  end

  test "a token for the whole space reaches every folder in it and none in another space" do
    token, = issue_agent_token
    assert_includes token.folder_ids, @space.root_folder_id
    assert_includes token.folder_ids, @other_folder.id
    assert_not_includes token.folder_ids, @elsewhere_folder.id
  end

  test "documents are documents and Collections only" do
    token, = issue_agent_token
    document = make_document(@plans, "Doc")
    collection = make_collection(@plans, "Things")
    @plans.documents.create!(title: "Sheet", doc_type: :spreadsheet, created_by: @owner)
    assert_equal [ document, collection ].sort_by(&:id), token.documents.sort_by(&:id)
  end

  test "a folder from another space cannot be used" do
    assert_raises(ActiveRecord::RecordInvalid) { issue_agent_token(folder: @elsewhere_folder) }
  end

  test "a folder token stops working when its folder moves to another space" do
    _token, plain = issue_agent_token(folder: @plans)
    assert AgentToken.authenticate(plain)
    @plans.update_column(:workspace_id, @elsewhere.id)
    assert_nil AgentToken.authenticate(plain)
  end

  test "deleting the folder deletes its token instead of widening it" do
    token, = issue_agent_token(folder: @drafts)
    @drafts.destroy!
    assert_not AgentToken.exists?(token.id)
  end

  test "tasks are the space's, or for a folder token those in the folder, below it or on its documents" do
    in_folder = @space.tasks.create!(title: "In folder", folder: @plans)
    below = @space.tasks.create!(title: "Below", folder: @drafts)
    document = make_document(@drafts, "Doc")
    on_document = @space.tasks.create!(title: "On document", document: document)
    outside = @space.tasks.create!(title: "Outside", folder: @other_folder)
    loose = @space.tasks.create!(title: "Loose")
    foreign = @elsewhere.tasks.create!(title: "Foreign")

    whole, = issue_agent_token
    assert_equal [ in_folder, below, on_document, outside, loose ].map(&:id).sort, whole.tasks.map(&:id).sort

    limited, = issue_agent_token(folder: @plans)
    assert_equal [ in_folder, below, on_document ].map(&:id).sort, limited.tasks.map(&:id).sort
    assert_not_includes limited.tasks.map(&:id), foreign.id
  end

  test "a space has a limited number of active tokens, and revoked ones do not count" do
    tokens = Array.new(AgentToken::MAX_ACTIVE_PER_SPACE) { issue_agent_token.first }
    assert_raises(ActiveRecord::RecordInvalid) { issue_agent_token }
    tokens.first.revoke!
    assert issue_agent_token.first.persisted?
  end

  test "permission is read or write and nothing else" do
    read, = issue_agent_token(permission: :read)
    write, = issue_agent_token(permission: "write")
    assert_not read.writable?
    assert write.writable?
    assert_raises(ActiveRecord::RecordInvalid) { issue_agent_token(permission: "admin") }
  end

  test "last use is recorded at most once a minute" do
    token, = issue_agent_token
    assert_nil token.last_used_at
    token.touch_used!
    first = token.reload.last_used_at
    assert first
    token.touch_used!
    assert_equal first, token.reload.last_used_at
  end

  test "deleting the space deletes its tokens and their activity" do
    token, = issue_agent_token
    AgentActivity.record!(token, "created_task", nil, "Created")
    @space.destroy!
    assert_not AgentToken.exists?(token.id)
    assert_equal 0, AgentActivity.where(agent_token_id: token.id).count
  end
end
