require "test_helper"

class ProjectFeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-project-features@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @project = @workspace.folders.create!(name: "Messages", kind: :project)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "a new project lists every page, and a plain folder lists none" do
    get "/api/v1/folders/#{@project.id}", headers: @headers
    assert_equal Folder::PROJECT_FEATURES, response.parsed_body["features"]

    post "/api/v1/folders", params: { folder: { name: "Site", kind: "project" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal Folder::PROJECT_FEATURES, response.parsed_body["features"]

    folder = @workspace.folders.create!(name: "Drafts")
    get "/api/v1/folders/#{folder.id}", headers: @headers
    assert_nil response.parsed_body["features"]
  end

  test "a member chooses a project's pages and the sidebar tree carries them" do
    patch "/api/v1/folders/#{@project.id}", params: { folder: { features: %w[sprints tasks] } }, headers: @headers, as: :json
    assert_response :success
    assert_equal %w[tasks sprints], response.parsed_body["features"]

    get "/api/v1/workspace", headers: @headers
    root = response.parsed_body["folders"].first
    project = root["children"].find { |f| f["id"] == @project.id }
    assert_equal %w[tasks sprints], project["features"]
  end

  test "every page can be turned off, and back on" do
    patch "/api/v1/folders/#{@project.id}", params: { folder: { features: [] } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [], response.parsed_body["features"]

    patch "/api/v1/folders/#{@project.id}", params: { folder: { features: Folder::PROJECT_FEATURES } }, headers: @headers, as: :json
    assert_equal Folder::PROJECT_FEATURES, response.parsed_body["features"]
  end

  test "turning a page off keeps its records" do
    sprint = @workspace.sprints.create!(title: "S1", folder: @project)
    patch "/api/v1/folders/#{@project.id}", params: { folder: { features: %w[tasks] } }, headers: @headers, as: :json
    assert_response :success

    get "/api/v1/sprints", headers: @headers.merge("X-Project-Id" => @project.id.to_s)
    assert_equal [ sprint.id ], response.parsed_body.map { |s| s["id"] }
  end

  test "unknown pages are rejected" do
    patch "/api/v1/folders/#{@project.id}", params: { folder: { features: %w[tasks bogus] } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_nil @project.reload.features
  end

  test "a plain folder cannot be given pages" do
    folder = @workspace.folders.create!(name: "Drafts")
    patch "/api/v1/folders/#{folder.id}", params: { folder: { features: %w[tasks] } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "a viewer cannot change a project's pages" do
    owner = User.create!(name: "Owner", email: "owner-project-features@example.com", password: "password123")
    space = Workspace.create!(name: "Team", user: owner)
    project = space.folders.create!(name: "Shared", kind: :project)
    space.memberships.create!(user: @user, role: :viewer)

    patch "/api/v1/folders/#{project.id}", params: { folder: { features: [] } }, headers: @headers.merge("X-Workspace-Id" => space.id.to_s), as: :json
    assert_response :forbidden
    assert_nil project.reload.features
  end
end
