require "test_helper"

class AgentTokensControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-agent-api@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-agent-api@example.com", password: "password123")
    @workspace = @owner.workspace
    @workspace.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @workspace.id.to_s }
  end

  test "an owner makes a token, sees it once, and the MCP URL; the list never shows the secret" do
    post "/api/v1/agent_tokens", params: { name: "Claude Code", permission: "write" }, headers: headers_for(@owner), as: :json
    assert_response :created
    body = response.parsed_body
    assert body["token"].start_with?("inertia_agent_")
    assert body["mcp_url"].end_with?("/mcp")
    assert_equal "write", body["permission"]

    get "/api/v1/agent_tokens", headers: headers_for(@owner)
    assert_equal [ "Claude Code" ], response.parsed_body.map { |t| t["name"] }
    assert_not_includes response.body, body["token"]
  end

  test "a token can be limited to a folder and revoked, which stops it working at once" do
    folder = @workspace.folders.create!(name: "Plans")
    post "/api/v1/agent_tokens", params: { name: "Scoped", folder_id: folder.id }, headers: headers_for(@owner), as: :json
    plain = response.parsed_body["token"]
    id = response.parsed_body["id"]
    assert_equal folder.id, AgentToken.find(id).folder_id

    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "ping" }.to_json, headers: { "Authorization" => "Bearer #{plain}", "Content-Type" => "application/json" }
    assert_response :success
    delete "/api/v1/agent_tokens/#{id}", headers: headers_for(@owner)
    assert_response :no_content
    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "ping" }.to_json, headers: { "Authorization" => "Bearer #{plain}", "Content-Type" => "application/json" }
    assert_response :unauthorized
  end

  test "a plain member cannot make, list or revoke tokens" do
    post "/api/v1/agent_tokens", params: { name: "Sneaky" }, headers: headers_for(@member), as: :json
    assert_response :forbidden
    get "/api/v1/agent_tokens", headers: headers_for(@member)
    assert_response :forbidden
  end

  test "an invalid permission or a missing name is rejected" do
    post "/api/v1/agent_tokens", params: { name: "X", permission: "admin" }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
    post "/api/v1/agent_tokens", params: { name: "" }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
  end

  test "the REST wrapper runs the same tools with the same rules" do
    folder = @workspace.folders.create!(name: "Plans")
    doc = Document.create!(title: "Plan", folder: folder, created_by: @owner, content: DocumentMarkdown.parse("# Plan\n\nHello", title: "Plan"))
    _, plain = AgentToken.issue!(workspace: @workspace, name: "REST")
    auth = { "Authorization" => "Bearer #{plain}" }

    get "/api/v1/agent/tools", headers: auth
    assert_includes response.parsed_body.map { |t| t["name"] }, "read_document"
    post "/api/v1/agent/tools/read_document", params: { id: doc.id }, headers: auth, as: :json
    assert_includes response.parsed_body.dig("result", "markdown"), "Hello"
    post "/api/v1/agent/tools/edit_document", params: { id: doc.id, markdown: "# x" }, headers: auth, as: :json
    assert_response :unprocessable_entity
    get "/api/v1/agent/tools"
    assert_response :unauthorized
  end
end
