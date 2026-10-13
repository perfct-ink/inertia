require "test_helper"

class WorkspacesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member@example.com", password: "password123")
    @viewer = User.create!(name: "Viewer", email: "viewer@example.com", password: "password123")
    @outsider = User.create!(name: "Outsider", email: "outsider@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  test "index lists every workspace the user belongs to with their role" do
    get "/api/v1/workspaces", headers: headers_for(@member)
    assert_response :success
    roles = response.parsed_body.to_h { |w| [ w["name"], w["role"] ] }
    assert_equal "owner", roles["Member's Workspace"]
    assert_equal "member", roles["Team"]
    assert_equal 2, roles.size
  end

  test "create makes the current user an owner" do
    post "/api/v1/workspaces", params: { workspace: { name: "Launch" } }, headers: headers_for(@outsider), as: :json
    assert_response :created
    assert_equal "owner", response.parsed_body["role"]
    assert_equal false, response.parsed_body["personal"]
  end

  test "show defaults to the personal workspace and honors X-Workspace-Id" do
    get "/api/v1/workspace", headers: headers_for(@member)
    assert_equal @member.workspace.id, response.parsed_body["id"]

    get "/api/v1/workspace", headers: headers_for(@member, workspace: @team)
    assert_response :success
    assert_equal @team.id, response.parsed_body["id"]
    assert_equal "member", response.parsed_body["role"]
  end

  test "a workspace the user does not belong to is not found" do
    get "/api/v1/workspace", headers: headers_for(@outsider, workspace: @team)
    assert_response :not_found
  end

  test "data is scoped to the selected workspace" do
    @team.tasks.create!(title: "Team task")
    @member.workspace.tasks.create!(title: "Private task")

    get "/api/v1/tasks", headers: headers_for(@member, workspace: @team)
    assert_equal [ "Team task" ], response.parsed_body.map { |t| t["title"] }

    get "/api/v1/tasks", headers: headers_for(@member)
    assert_equal [ "Private task" ], response.parsed_body.map { |t| t["title"] }
  end

  test "members can write in a shared workspace and viewers cannot" do
    post "/api/v1/tasks", params: { task: { title: "By member" } }, headers: headers_for(@member, workspace: @team), as: :json
    assert_response :created

    post "/api/v1/tasks", params: { task: { title: "By viewer" } }, headers: headers_for(@viewer, workspace: @team), as: :json
    assert_response :forbidden

    get "/api/v1/tasks", headers: headers_for(@viewer, workspace: @team)
    assert_response :success
  end

  test "documents are found across workspaces and the role of their own workspace applies" do
    folder = @team.root_folder
    doc = folder.documents.create!(title: "Plan", doc_type: :document, created_by: @owner)

    get "/api/v1/documents/#{doc.id}", headers: headers_for(@viewer)
    assert_response :success

    patch "/api/v1/documents/#{doc.id}", params: { document: { title: "Nope" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden

    patch "/api/v1/documents/#{doc.id}", params: { document: { title: "Better" } }, headers: headers_for(@member), as: :json
    assert_response :success

    get "/api/v1/documents/#{doc.id}", headers: headers_for(@outsider)
    assert_response :not_found
  end

  test "only admins and owners rename a workspace" do
    patch "/api/v1/workspace", params: { workspace: { name: "Nope" } }, headers: headers_for(@member, workspace: @team), as: :json
    assert_response :forbidden

    patch "/api/v1/workspace", params: { workspace: { name: "Renamed" } }, headers: headers_for(@owner, workspace: @team), as: :json
    assert_response :success
    assert_equal "Renamed", @team.reload.name
  end

  test "only an owner deletes a shared workspace and a personal one cannot be deleted" do
    delete "/api/v1/workspaces/#{@team.id}", headers: headers_for(@member)
    assert_response :forbidden

    delete "/api/v1/workspaces/#{@owner.workspace.id}", headers: headers_for(@owner)
    assert_response :unprocessable_entity

    delete "/api/v1/workspaces/#{@team.id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not Workspace.exists?(@team.id)
  end
end
