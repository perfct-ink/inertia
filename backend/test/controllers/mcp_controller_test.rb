require "test_helper"

class McpControllerTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.create!(name: "Pat", email: "pat-mcp@example.com", password: "password123")
    @workspace = @user.workspace
    folder = @workspace.folders.create!(name: "Plans")
    @doc = Document.create!(title: "Launch plan", folder: folder, created_by: @user, content: DocumentMarkdown.parse("# Launch plan\n\nShip it.", title: "Launch plan"))
    @write_token, @write_plain = AgentToken.issue!(workspace: @workspace, name: "Writer", permission: :write)
    @read_token, @read_plain = AgentToken.issue!(workspace: @workspace, name: "Reader")
  end

  def rpc(method, params = nil, token: @write_plain, id: 1)
    body = { jsonrpc: "2.0", method: method, params: params }
    body[:id] = id if id
    post "/mcp", params: body.compact.to_json, headers: { "Authorization" => "Bearer #{token}", "Content-Type" => "application/json" }
  end

  test "initialize answers with the protocol version and tools capability" do
    rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1" } })
    assert_response :success
    result = response.parsed_body["result"]
    assert_equal "2025-03-26", result["protocolVersion"]
    assert_equal "inertia", result["serverInfo"]["name"]
    assert result["capabilities"].key?("tools")
  end

  test "tools/list shows write tools to a write token and hides them from a read token" do
    rpc("tools/list")
    assert_includes response.parsed_body.dig("result", "tools").map { |t| t["name"] }, "edit_document"
    rpc("tools/list", token: @read_plain)
    names = response.parsed_body.dig("result", "tools").map { |t| t["name"] }
    assert_includes names, "read_document"
    assert_not_includes names, "edit_document"
  end

  test "tools/call reads a document and ticks a task" do
    rpc("tools/call", { name: "read_document", arguments: { id: @doc.id } })
    content = response.parsed_body.dig("result", "content", 0, "text")
    assert_includes content, "Ship it."
    assert_equal false, response.parsed_body.dig("result", "isError")

    task = @workspace.tasks.create!(title: "Write spec", document: @doc)
    rpc("tools/call", { name: "update_task", arguments: { id: task.id, status: "done" } })
    assert_equal "done", task.reload.status
    assert_equal "updated_task", @write_token.activities.last.action
  end

  test "a failing tool is a result with isError, not a protocol error" do
    rpc("tools/call", { name: "read_document", arguments: { id: 999_999 } })
    assert_response :success
    assert_equal true, response.parsed_body.dig("result", "isError")
    assert_match(/not found/, response.parsed_body.dig("result", "content", 0, "text"))
    rpc("tools/call", { name: "edit_document", arguments: { id: @doc.id, markdown: "# x" } }, token: @read_plain)
    assert_equal true, response.parsed_body.dig("result", "isError")
  end

  test "notifications get no body, unknown methods an error, and ping works" do
    rpc("notifications/initialized", id: nil)
    assert_response :accepted
    rpc("nope")
    assert_equal(-32_601, response.parsed_body.dig("error", "code"))
    rpc("ping")
    assert_equal({}, response.parsed_body["result"])
  end

  test "a missing, revoked or non-agent token is unauthorized" do
    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "ping" }.to_json, headers: { "Content-Type" => "application/json" }
    assert_response :unauthorized
    assert_match(/Bearer/, response.headers["WWW-Authenticate"])
    @write_token.revoke!
    rpc("ping")
    assert_response :unauthorized
    rpc("ping", token: "not-an-agent-token")
    assert_response :unauthorized
  end

  test "a token reaches only its own space" do
    other = User.create!(name: "O", email: "o-mcp@example.com", password: "password123")
    theirs = Document.create!(title: "Theirs", folder: other.workspace.folders.create!(name: "X"), created_by: other)
    rpc("tools/call", { name: "read_document", arguments: { id: theirs.id } })
    assert_equal true, response.parsed_body.dig("result", "isError")
  end

  test "batches are answered together, and bad JSON is a parse error" do
    post "/mcp", params: [ { jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", id: 2, method: "ping" } ].to_json,
                 headers: { "Authorization" => "Bearer #{@write_plain}", "Content-Type" => "application/json" }
    assert_equal [ 1, 2 ], response.parsed_body.map { |r| r["id"] }
    post "/mcp", params: "{oops", headers: { "Authorization" => "Bearer #{@write_plain}", "Content-Type" => "application/json" }
    assert_response :bad_request
  end

  test "GET is not allowed" do
    get "/mcp"
    assert_response :method_not_allowed
  end
end
