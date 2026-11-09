require "test_helper"

class WorkspaceFeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-features@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "admin-features@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-features@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  test "every Space lists all features until it chooses, in both the list and the active Space" do
    get "/api/v1/workspace", headers: headers_for(@owner, workspace: @team)
    assert_equal Workspace::FEATURES, response.parsed_body["features"]

    get "/api/v1/workspaces", headers: headers_for(@owner)
    assert(response.parsed_body.all? { |w| w["features"] == Workspace::FEATURES })
  end

  test "a new Space can start with a chosen set of features" do
    post "/api/v1/workspaces", params: { workspace: { name: "Band", features: %w[events roadmap] } }, headers: headers_for(@member), as: :json
    assert_response :created
    assert_equal %w[events roadmap], response.parsed_body["features"]
    assert_equal "owner", response.parsed_body["role"]
  end

  test "an owner and an admin change the features and the choice comes back in the list" do
    patch "/api/v1/workspace", params: { workspace: { features: %w[okrs sprints] } }, headers: headers_for(@owner, workspace: @team), as: :json
    assert_response :success
    assert_equal %w[sprints okrs], response.parsed_body["features"]

    patch "/api/v1/workspace", params: { workspace: { features: %w[events] } }, headers: headers_for(@admin, workspace: @team), as: :json
    assert_response :success

    get "/api/v1/workspaces", headers: headers_for(@member)
    team = response.parsed_body.find { |w| w["name"] == "Team" }
    assert_equal %w[events], team["features"]
  end

  test "every feature off, then back on, keeps the Space's records" do
    sprint = @team.sprints.create!(title: "S1")

    patch "/api/v1/workspace", params: { workspace: { features: [] } }, headers: headers_for(@owner, workspace: @team), as: :json
    assert_response :success
    assert_equal [], response.parsed_body["features"]

    get "/api/v1/sprints", headers: headers_for(@member, workspace: @team)
    assert_equal [ sprint.id ], response.parsed_body.map { |s| s["id"] }

    patch "/api/v1/workspace", params: { workspace: { features: Workspace::FEATURES } }, headers: headers_for(@owner, workspace: @team), as: :json
    assert_equal Workspace::FEATURES, response.parsed_body["features"]
    assert_nil @team.reload.features
  end

  test "an unknown feature is a 422 and changes nothing" do
    patch "/api/v1/workspace", params: { workspace: { features: %w[bogus] } }, headers: headers_for(@owner, workspace: @team), as: :json
    assert_response :unprocessable_entity
    assert_nil @team.reload.features
  end

  test "a plain member cannot change the features" do
    patch "/api/v1/workspace", params: { workspace: { features: [] } }, headers: headers_for(@member, workspace: @team), as: :json
    assert_response :forbidden
    assert_nil @team.reload.features
  end
end
