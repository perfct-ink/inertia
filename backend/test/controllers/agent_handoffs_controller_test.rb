require "test_helper"

class AgentHandoffsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-handoff@example.com", password: "password123")
    @viewer = User.create!(name: "Viewer", email: "viewer-handoff@example.com", password: "password123")
    @workspace = @owner.workspace
    @workspace.memberships.create!(user: @viewer, role: :viewer)
    @folder = @workspace.folders.create!(name: "Plans")
    @doc = Document.create!(title: "PRD", folder: @folder, created_by: @owner, content: DocumentMarkdown.parse("# PRD\n\nBuild it", title: "PRD"))
    @task = @workspace.tasks.create!(title: "Ship it", document: @doc, folder: @folder)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @workspace.id.to_s }
  end

  test "sending a document returns a prompt, the MCP URL and a token that reaches only its folder" do
    post "/api/v1/agent_handoffs", params: { subject_type: "document", subject_id: @doc.id, instruction: "Build this" }, headers: headers_for(@owner), as: :json
    assert_response :created
    body = response.parsed_body
    assert body["token"].start_with?("inertia_agent_")
    assert body["mcp_url"].end_with?("/mcp")
    assert_includes body["prompt"], "Instruction: Build this"
    assert_includes body["prompt"], "Document #{@doc.id}: PRD"
    assert_includes body["prompt"], "Ship it"
    assert_equal "sent", body["status"]
    assert_equal "Owner", body["sent_by_name"]
    assert_not_includes body["prompt"], body["token"]

    token = AgentToken.authenticate(body["token"])
    assert_equal @folder, token.folder
    assert token.writable?
  end

  test "the list shows a handoff as working once the agent uses its token, and closed when revoked" do
    post "/api/v1/agent_handoffs", params: { subject_type: "task", subject_id: @task.id }, headers: headers_for(@owner), as: :json
    plain = response.parsed_body["token"]
    AgentToken.authenticate(plain).touch_used!
    get "/api/v1/agent_handoffs", params: { subject_type: "task", subject_id: @task.id }, headers: headers_for(@owner)
    assert_equal [ "working" ], response.parsed_body.map { |h| h["status"] }
    assert_not_includes response.body, plain
    AgentToken.authenticate(plain).revoke!
    get "/api/v1/agent_handoffs", params: { subject_type: "task", subject_id: @task.id }, headers: headers_for(@owner)
    assert_equal [ "closed" ], response.parsed_body.map { |h| h["status"] }
  end

  test "a folder handoff lists its documents and can be read-only" do
    post "/api/v1/agent_handoffs", params: { subject_type: "folder", subject_id: @folder.id, permission: "read" }, headers: headers_for(@owner), as: :json
    assert_response :created
    assert_includes response.parsed_body["prompt"], "- #{@doc.id}: PRD"
    assert_includes response.parsed_body["prompt"], "read-only"
    assert_not AgentToken.authenticate(response.parsed_body["token"]).writable?
  end

  test "viewers cannot send, and other spaces' items and bad types are rejected" do
    post "/api/v1/agent_handoffs", params: { subject_type: "document", subject_id: @doc.id }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    post "/api/v1/agent_handoffs", params: { subject_type: "user", subject_id: 1 }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
    other = User.create!(name: "Other", email: "other-handoff@example.com", password: "password123")
    foreign = other.workspace.folders.create!(name: "Theirs")
    post "/api/v1/agent_handoffs", params: { subject_type: "folder", subject_id: foreign.id }, headers: headers_for(@owner), as: :json
    assert_response :not_found
  end
end
