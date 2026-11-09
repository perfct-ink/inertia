require "test_helper"
require_relative "../support/agent_access"

# POST /mcp: Inertia's MCP server (JSON-RPC over HTTP) for outside agents.
class McpControllerTest < ActionDispatch::IntegrationTest
  include AgentAccess

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    build_agent_space
    @token, @plain = issue_agent_token
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def rpc(method, params = nil, id: 1, plain: @plain)
    body = { jsonrpc: "2.0", method: method }
    body[:id] = id if id
    body[:params] = params if params
    post "/mcp", params: body, headers: agent_headers(plain), as: :json
  end

  def call_tool(name, arguments = {}, **options)
    rpc("tools/call", { name: name, arguments: arguments }, **options)
  end

  def tool_result
    result = response.parsed_body["result"]
    [ result["isError"], result["content"].first["text"] ]
  end

  test "initialize answers with the protocol, the tools capability and the space" do
    rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "claude-code", version: "1" } })
    assert_response :success
    result = response.parsed_body["result"]
    assert_equal "2.0", response.parsed_body["jsonrpc"]
    assert_equal 1, response.parsed_body["id"]
    assert_equal "2025-03-26", result["protocolVersion"]
    assert_equal "inertia", result.dig("serverInfo", "name")
    assert result["capabilities"].key?("tools")
    assert_includes result["instructions"], "Agent Space"
    assert_not_includes result["instructions"], "read only"
  end

  test "an unknown protocol version gets the newest one the server speaks" do
    rpc("initialize", { protocolVersion: "1999-01-01" })
    assert_equal "2025-06-18", response.parsed_body.dig("result", "protocolVersion")
  end

  test "tools/list shows write tools only to a read-write token" do
    rpc("tools/list")
    names = response.parsed_body.dig("result", "tools").map { |t| t["name"] }
    assert_includes names, "edit_document"
    assert_includes names, "write_collection_record"
    assert response.parsed_body.dig("result", "tools").all? { |t| t["inputSchema"]["type"] == "object" }

    _readonly, plain = issue_agent_token(permission: :read, name: "Reader")
    rpc("tools/list", plain: plain)
    read_names = response.parsed_body.dig("result", "tools").map { |t| t["name"] }
    assert_includes read_names, "read_document"
    assert_not_includes read_names, "edit_document"
    assert_not_includes read_names, "create_task"
  end

  test "an agent reads a document, ticks a task and edits a paragraph" do
    task = @space.tasks.create!(title: "Ship it", status: :todo)
    document = make_document(@plans, "Plan", paragraph_node("Old words"), task_list_node([ task.id, "Ship it" ]))
    task.update!(document: document)

    call_tool("read_document", { id: document.id })
    is_error, text = tool_result
    assert_not is_error
    read = JSON.parse(text)
    assert_includes read["markdown"], "- [ ] Ship it <!-- task:#{task.id} -->"

    edited = read["markdown"].sub("Old words", "New words").sub("- [ ] Ship it", "- [x] Ship it")
    call_tool("edit_document", { id: document.id, markdown: edited, base_updated_at: read["updated_at"] })
    assert_not tool_result.first

    assert_equal "New words", document.reload.content["content"][1].dig("content", 0, "text")
    assert_equal "done", task.reload.status
    assert_equal @token, task.status_changes.last.agent_token
    assert_equal [ @token ], AgentActivity.all.map(&:agent_token).uniq
  end

  test "a tool failure is a result the agent can read, not a protocol error" do
    call_tool("read_document", { id: 0 })
    assert_response :success
    is_error, text = tool_result
    assert is_error
    assert_match(/not found/, text)

    call_tool("no_such_tool")
    assert tool_result.first
    assert_match(/Unknown tool/, tool_result.last)
  end

  test "a read-only token cannot call a write tool even if it names one" do
    document = make_document(@plans, "Plan", paragraph_node("Same"))
    _readonly, plain = issue_agent_token(permission: :read, name: "Reader")
    call_tool("edit_document", { id: document.id, markdown: "# Plan\n\nChanged\n" }, plain: plain)
    is_error, text = tool_result
    assert is_error
    assert_match(/read-only/, text)
    assert_equal "Same", document.reload.content["content"].last.dig("content", 0, "text")
  end

  test "an agent cannot reach another space or, with a folder token, another folder" do
    theirs = make_document(@elsewhere_folder, "Theirs", by: @stranger)
    outside = make_document(@other_folder, "Outside")
    call_tool("read_document", { id: theirs.id })
    assert tool_result.first

    _limited, plain = issue_agent_token(folder: @plans, name: "Plans only")
    call_tool("read_document", { id: outside.id }, plain: plain)
    assert tool_result.first
    call_tool("list_documents", {}, plain: plain)
    assert_equal [], JSON.parse(tool_result.last)
  end

  test "a missing, wrong or revoked token gets the same 401, and revoking works at once" do
    document = make_document(@plans, "Plan")

    call_tool("read_document", { id: document.id })
    assert_response :success

    @token.revoke!
    call_tool("read_document", { id: document.id })
    assert_response :unauthorized
    revoked_body = response.body

    call_tool("read_document", { id: document.id }, plain: "inertia_agent_wrong")
    assert_response :unauthorized
    assert_equal revoked_body, response.body
    assert_equal 'Bearer realm="inertia"', response.headers["WWW-Authenticate"]

    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "tools/list" }, as: :json
    assert_response :unauthorized
    assert_equal revoked_body, response.body
  end

  test "a signed-in person's token is not an agent token, and an agent token is not a person's" do
    post "/mcp", params: { jsonrpc: "2.0", id: 1, method: "tools/list" }, headers: user_headers(@owner), as: :json
    assert_response :unauthorized

    get "/api/v1/tasks", headers: agent_headers(@plain)
    assert_response :unauthorized
    get "/api/v1/documents/#{make_document(@plans, 'Plan').id}", headers: agent_headers(@plain)
    assert_response :unauthorized
  end

  test "a token stops working when the owner who made it loses the role" do
    second = create_agent_user("second")
    @space.memberships.create!(user: second, role: :owner)
    rpc("tools/list")
    assert_response :success
    @space.memberships.find_by!(user: @owner).update!(role: :member)
    rpc("tools/list")
    assert_response :unauthorized
  end

  test "notifications get no reply, batches get one reply each, and unknown methods are errors" do
    rpc("notifications/initialized", id: nil)
    assert_response :accepted
    assert_empty response.body

    post "/mcp", params: [ { jsonrpc: "2.0", id: 1, method: "ping" }, { jsonrpc: "2.0", method: "notifications/initialized" }, { jsonrpc: "2.0", id: 2, method: "tools/list" } ],
      headers: agent_headers(@plain), as: :json
    assert_response :success
    assert_equal [ 1, 2 ], response.parsed_body.map { |reply| reply["id"] }

    rpc("resources/list")
    assert_response :success
    assert_equal(-32_601, response.parsed_body.dig("error", "code"))
  end

  test "a body that is not JSON-RPC is rejected" do
    post "/mcp", params: "{nope", headers: agent_headers(@plain).merge("CONTENT_TYPE" => "text/plain")
    assert_response :bad_request
    assert_equal(-32_700, response.parsed_body.dig("error", "code"))

    post "/mcp", params: "5", headers: agent_headers(@plain).merge("CONTENT_TYPE" => "text/plain")
    assert_response :bad_request
    assert_equal(-32_600, response.parsed_body.dig("error", "code"))
  end

  test "there is no event stream: GET is not allowed" do
    get "/mcp", headers: agent_headers(@plain)
    assert_response :method_not_allowed
  end

  test "neither the token nor document text reaches the request log parameters" do
    document = make_document(@plans, "Plan")
    logged = []
    subscriber = ActiveSupport::Notifications.subscribe("process_action.action_controller") { |*args| logged << args.last[:params].to_s }
    call_tool("edit_document", { id: document.id, markdown: "# Plan\n\nA private sentence\n" })
    ActiveSupport::Notifications.unsubscribe(subscriber)

    assert_not_empty logged
    logged.each do |line|
      assert_not_includes line, "A private sentence"
      assert_not_includes line, @plain
    end
  end
end
