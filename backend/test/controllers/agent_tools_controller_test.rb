require "test_helper"
require_relative "../support/agent_access"

# /api/v1/agent/tools: the same operations as the MCP server, over plain REST.
class AgentToolsControllerTest < ActionDispatch::IntegrationTest
  include AgentAccess

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    build_agent_space
    @token, @plain = issue_agent_token
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def run_tool(name, plain: @plain, **arguments)
    post "/api/v1/agent/tools/#{name}", params: arguments, headers: agent_headers(plain), as: :json
  end

  test "the tool list depends on the token's permission" do
    get "/api/v1/agent/tools", headers: agent_headers(@plain)
    assert_response :success
    tools = response.parsed_body
    assert_includes tools.map { |t| t["name"] }, "edit_document"
    assert tools.find { |t| t["name"] == "edit_document" }["write"]
    assert_not tools.find { |t| t["name"] == "read_document" }["write"]

    _readonly, plain = issue_agent_token(permission: :read, name: "Reader")
    get "/api/v1/agent/tools", headers: agent_headers(plain)
    assert_not_includes response.parsed_body.map { |t| t["name"] }, "edit_document"
  end

  test "read, edit and tick over REST, with the agent as author" do
    task = @space.tasks.create!(title: "Ship it", status: :todo)
    document = make_document(@plans, "Plan", paragraph_node("Old words"), task_list_node([ task.id, "Ship it" ]))
    task.update!(document: document)

    run_tool("read_document", id: document.id)
    assert_response :success
    markdown = response.parsed_body.dig("result", "markdown")
    assert_includes markdown, "<!-- task:#{task.id} -->"

    run_tool("edit_document", id: document.id, markdown: markdown.sub("Old words", "New words").sub("[ ]", "[x]"))
    assert_response :success
    assert_equal "New words", document.reload.content["content"][1].dig("content", 0, "text")
    assert_equal "done", task.reload.status
    assert_equal @token, task.status_changes.last.agent_token
  end

  test "tasks and Collection records work over REST" do
    run_tool("create_task", title: "From REST")
    assert_response :success
    id = response.parsed_body.dig("result", "id")
    run_tool("update_task", id: id, status: "in_progress")
    assert_equal "in_progress", response.parsed_body.dig("result", "status")
    run_tool("list_tasks", status: "in_progress")
    assert_equal [ id ], response.parsed_body["result"].map { |t| t["id"] }

    people = make_collection(@plans, "People")
    people.table_fields.create!(name: "Name", data_type: "text")
    run_tool("write_collection_record", id: people.id, values: { Name: "Ada" })
    assert_response :success
    run_tool("read_collection", id: people.id)
    assert_equal [ { "Name" => "Ada" } ], response.parsed_body.dig("result", "records").map { |r| r["values"] }
  end

  test "a failed tool is a 422 with a readable message, and nothing else is reachable" do
    theirs = make_document(@elsewhere_folder, "Theirs", by: @stranger)
    run_tool("read_document", id: theirs.id)
    assert_response :unprocessable_entity
    assert_match(/not found/, response.parsed_body["error"])

    run_tool("no_such_tool")
    assert_response :unprocessable_entity

    _readonly, plain = issue_agent_token(permission: :read, name: "Reader")
    run_tool("create_task", plain: plain, title: "Nope")
    assert_response :unprocessable_entity
    assert_match(/read-only/, response.parsed_body["error"])
    assert_equal 0, Task.where(title: "Nope").count
  end

  test "a bad body is a 400" do
    post "/api/v1/agent/tools/list_tasks", params: [ 1, 2 ], headers: agent_headers(@plain), as: :json
    assert_response :bad_request
    post "/api/v1/agent/tools/list_tasks", params: "{nope", headers: agent_headers(@plain).merge("CONTENT_TYPE" => "text/plain")
    assert_response :bad_request
  end

  test "a missing, wrong or revoked token is a 401, and a person's sign-in is not accepted" do
    run_tool("list_tasks", plain: "inertia_agent_wrong")
    assert_response :unauthorized

    post "/api/v1/agent/tools/list_tasks", headers: user_headers(@owner), as: :json
    assert_response :unauthorized

    @token.revoke!
    run_tool("list_tasks")
    assert_response :unauthorized
    get "/api/v1/agent/tools", headers: agent_headers(@plain)
    assert_response :unauthorized
  end
end
