require "test_helper"

class MilestonesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-ms-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-ms-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  test "create lists and update a milestone" do
    post "/api/v1/milestones", params: { milestone: { title: "Beta", target_date: "2026-12-01" } }, headers: @headers, as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert_equal "planned", response.parsed_body["status"]

    patch "/api/v1/milestones/#{id}", params: { milestone: { status: "active", description: "Public beta" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "active", response.parsed_body["status"]

    get "/api/v1/milestones", headers: @headers
    assert_response :success
    assert_equal [ "Beta" ], response.parsed_body.map { |m| m["title"] }
  end

  test "index includes the rollup for tasks reaching the milestone through epics and initiatives" do
    milestone = @user.workspace.milestones.create!(title: "Beta", target_date: Date.current + 3)
    initiative = @user.workspace.initiatives.create!(title: "Theme", milestone: milestone)
    epic = @user.workspace.epics.create!(title: "Epic", initiative: initiative)
    @user.workspace.tasks.create!(title: "Done", epic: epic, status: :done)
    @user.workspace.tasks.create!(title: "Open", epic: epic, status: :todo)

    get "/api/v1/milestones", headers: @headers
    row = response.parsed_body.first
    assert_equal 2, row["tasks_count"]
    assert_equal 1, row["done_tasks_count"]
    assert_equal 50, row["percent"]
    assert_equal 1, row["epics_count"]
    assert_equal 1, row["initiatives_count"]
    assert_equal "at_risk", row["health"]
  end

  test "a task epic and initiative can be assigned a milestone" do
    milestone = @user.workspace.milestones.create!(title: "Beta")
    post "/api/v1/tasks", params: { task: { title: "T", milestone_id: milestone.id } }, headers: @headers, as: :json
    assert_response :created
    assert_equal milestone.id, response.parsed_body["milestone_id"]

    post "/api/v1/epics", params: { epic: { title: "E", milestone_id: milestone.id } }, headers: @headers, as: :json
    assert_response :created
    assert_equal milestone.id, response.parsed_body["milestone_id"]

    post "/api/v1/initiatives", params: { initiative: { title: "I", milestone_id: milestone.id, status: "active", description: "Why" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "active", response.parsed_body["status"]
    assert_equal milestone.id, response.parsed_body["milestone_id"]
  end

  test "a milestone from another workspace is rejected" do
    foreign = @team.milestones.create!(title: "Team milestone")
    post "/api/v1/tasks", params: { task: { title: "T", milestone_id: foreign.id } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "milestones are scoped to the selected workspace and viewers cannot change them" do
    @team.milestones.create!(title: "Team milestone")
    @user.workspace.milestones.create!(title: "Mine")

    get "/api/v1/milestones", headers: headers_for(@user, workspace: @team)
    assert_equal [ "Team milestone" ], response.parsed_body.map { |m| m["title"] }

    get "/api/v1/milestones", headers: headers_for(@viewer, workspace: @team)
    assert_response :success

    post "/api/v1/milestones", params: { milestone: { title: "Nope" } }, headers: headers_for(@viewer, workspace: @team), as: :json
    assert_response :forbidden
  end

  test "destroy removes the milestone" do
    milestone = @user.workspace.milestones.create!(title: "Gone")
    delete "/api/v1/milestones/#{milestone.id}", headers: @headers
    assert_response :no_content
    assert_not Milestone.exists?(milestone.id)
  end
end
