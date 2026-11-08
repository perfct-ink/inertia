require "test_helper"

class ProjectTypesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-ptypes-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-ptypes-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @project = @team.folders.create!(name: "Album", kind: :project)
    @project.documents.create!(title: "Song", created_by: @user)
    @team.tasks.create!(title: "Master", folder: @project)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def save_type(name: "Release", from: @project, user: @user)
    post "/api/v1/project_types", params: { project_type: { name: name, description: "Songs", icon: "🎵", from_folder_id: from.id } }, headers: headers_for(user), as: :json
  end

  test "saving a project as a type keeps its documents and tasks, and lists them as counts" do
    save_type
    assert_response :created
    body = response.parsed_body
    assert_equal "custom_#{body['id']}", body["key"]
    assert_equal({ "name" => "Release", "description" => "Songs", "icon" => "🎵" }, body.slice("name", "description", "icon"))
    assert_equal({ "documents" => 1, "collections" => 0, "tasks" => 1 }, body["starts_with"])
    assert_not_includes body.keys, "template"

    get "/api/v1/project_types", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ "Release" ], response.parsed_body.map { |t| t["name"] }
  end

  test "only a project can be saved, and the name must be new" do
    save_type(from: @team.folders.create!(name: "Plain"))
    assert_response :unprocessable_entity
    assert_match(/project/, response.parsed_body["errors"].join)

    save_type
    save_type(name: "release")
    assert_response :unprocessable_entity
    assert_match(/Name/, response.parsed_body["errors"].join)
  end

  test "a project with more than a type can hold is refused with the reason" do
    (ProjectTemplate::MAX_DOCUMENTS + 1).times { |i| @project.documents.create!(title: "Doc #{i}", created_by: @user) }
    save_type
    assert_response :unprocessable_entity
    assert_match(/at most #{ProjectTemplate::MAX_DOCUMENTS} documents/, response.parsed_body["errors"].join)
    assert_equal 0, ProjectType.count
  end

  test "deleting a type returns its projects to blank" do
    save_type
    type = ProjectType.last
    @project.update!(project_type: type.key)

    delete "/api/v1/project_types/#{type.id}", headers: headers_for(@user)
    assert_response :no_content
    assert_equal "blank", @project.reload.project_type
    assert_equal 1, @project.documents.count
  end

  test "viewers cannot save or delete, and another Space's types and projects are not found" do
    save_type(user: @viewer)
    assert_response :forbidden

    save_type
    type = ProjectType.last
    delete "/api/v1/project_types/#{type.id}", headers: headers_for(@viewer)
    assert_response :forbidden

    stranger = User.create!(name: "Out", email: "out-ptypes-api@example.com", password: "password123")
    other = Workspace.create!(name: "Other", user: stranger)
    get "/api/v1/project_types", headers: headers_for(stranger, workspace: other)
    assert_equal [], response.parsed_body
    delete "/api/v1/project_types/#{type.id}", headers: headers_for(stranger, workspace: other)
    assert_response :not_found
    save_type(name: "Mine", user: stranger)
    assert_response :not_found
    post "/api/v1/project_types", params: { project_type: { name: "Mine", from_folder_id: @project.id } }, headers: headers_for(stranger, workspace: other), as: :json
    assert_response :not_found
  end
end
