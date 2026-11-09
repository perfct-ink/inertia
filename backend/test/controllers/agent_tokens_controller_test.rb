require "test_helper"
require_relative "../support/agent_access"

# /api/v1/agent_tokens: Space owners make, list and revoke agent tokens.
class AgentTokensControllerTest < ActionDispatch::IntegrationTest
  include AgentAccess

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    build_agent_space
    @admin = create_agent_user("admin")
    @member = create_agent_user("member")
    @space.memberships.create!(user: @admin, role: :admin)
    @space.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def owner_headers
    user_headers(@owner, space: @space)
  end

  def create_token(headers: owner_headers, **params)
    post "/api/v1/agent_tokens", params: { name: "Claude Code", permission: "write" }.merge(params), headers: headers, as: :json
  end

  test "an owner makes a token and sees it exactly once" do
    create_token
    assert_response :created
    assert_equal "no-store", response.headers["Cache-Control"]
    body = response.parsed_body
    plain = body["token"]
    assert plain.start_with?(AgentToken::PREFIX)
    assert body["mcp_url"].end_with?("/mcp")
    assert_equal [ "Claude Code", "write", nil ], [ body["name"], body["permission"], body["folder_id"] ]
    assert_equal "Owner", body["created_by_name"]

    record = AgentToken.find(body["id"])
    assert_equal AgentToken.digest(plain), record.token_digest
    assert_equal @space, record.workspace

    get "/api/v1/agent_tokens", headers: owner_headers
    assert_response :success
    assert_equal [ body["id"] ], response.parsed_body.map { |t| t["id"] }
    assert_not_includes response.body, plain
    assert_not_includes response.body, record.token_digest
    assert_not response.parsed_body.first.key?("token")
    assert_not response.parsed_body.first.key?("token_digest")
  end

  test "a token can be limited to a folder and made read-only" do
    create_token(folder_id: @plans.id, permission: "read")
    assert_response :created
    assert_equal [ @plans.id, "read" ], response.parsed_body.values_at("folder_id", "permission")
    assert_not AgentToken.find(response.parsed_body["id"]).writable?
  end

  test "a folder from another space is not found, and a bad permission is refused" do
    create_token(folder_id: @elsewhere_folder.id)
    assert_response :not_found
    create_token(permission: "root")
    assert_response :unprocessable_entity
    create_token(name: " ")
    assert_response :unprocessable_entity
    assert_equal 0, AgentToken.count
  end

  test "the permission defaults to read-only" do
    create_token(permission: nil)
    assert_response :created
    assert_equal "read", response.parsed_body["permission"]
  end

  test "only owners manage tokens: admins and members cannot list, make or revoke" do
    token, = issue_agent_token
    [ @admin, @member ].each do |person|
      headers = user_headers(person, space: @space)
      get "/api/v1/agent_tokens", headers: headers
      assert_response :forbidden
      create_token(headers: headers)
      assert_response :forbidden
      delete "/api/v1/agent_tokens/#{token.id}", headers: headers
      assert_response :forbidden
    end
    assert_nil token.reload.revoked_at
    assert_equal 1, AgentToken.count
  end

  test "someone outside the space cannot even see that it exists" do
    headers = user_headers(@stranger, space: @space)
    get "/api/v1/agent_tokens", headers: headers
    assert_response :not_found
    create_token(headers: headers)
    assert_response :not_found
  end

  test "revoking stops the token at once and keeps its history" do
    token, plain = issue_agent_token
    AgentActivity.record!(token, "created_task", nil, "Created a task")

    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "tools/list" }, headers: agent_headers(plain), as: :json
    assert_response :success

    delete "/api/v1/agent_tokens/#{token.id}", headers: owner_headers
    assert_response :no_content
    assert token.reload.revoked?
    assert_equal 1, token.activities.count

    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "tools/list" }, headers: agent_headers(plain), as: :json
    assert_response :unauthorized

    get "/api/v1/agent_tokens", headers: owner_headers
    assert_equal [ true ], response.parsed_body.map { |t| t["revoked_at"].present? }
  end

  test "an owner of another space cannot revoke this space's token" do
    token, plain = issue_agent_token
    delete "/api/v1/agent_tokens/#{token.id}", headers: user_headers(@stranger, space: @elsewhere)
    assert_response :not_found
    assert_not token.reload.revoked?
    assert AgentToken.authenticate(plain)
  end

  test "a space has a limit on active tokens" do
    AgentToken::MAX_ACTIVE_PER_SPACE.times { issue_agent_token }
    create_token
    assert_response :unprocessable_entity
    assert_match(/at most/, response.parsed_body["errors"].first)
  end

  test "an agent token cannot manage tokens" do
    _token, plain = issue_agent_token
    get "/api/v1/agent_tokens", headers: agent_headers(plain).merge("X-Workspace-Id" => @space.id.to_s)
    assert_response :unauthorized
  end
end
