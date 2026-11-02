require "test_helper"

class ActivitiesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-activity-api@example.com", password: "password123")
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  test "lists an item's activity newest first with who did it" do
    post "/api/v1/tasks", params: { task: { title: "Ship", status: "todo" } }, headers: @headers, as: :json
    id = response.parsed_body["id"]
    patch "/api/v1/tasks/#{id}", params: { task: { status: "done" } }, headers: @headers, as: :json

    get "/api/v1/activities", params: { subject_type: "Task", subject_id: id }, headers: @headers

    assert_response :success
    assert_equal(
      [ [ "updated", "Pat", { "status" => [ "todo", "done" ] } ], [ "created", "Pat", {} ] ],
      response.parsed_body.map { |entry| [ entry["action"], entry["actor_name"], entry["changes"] ] }
    )
  end

  test "documents have a log too" do
    folder = @user.workspace.folders.create!(name: "Docs")
    post "/api/v1/folders/#{folder.id}/documents", params: { document: { title: "Plan" } }, headers: @headers, as: :json
    id = response.parsed_body["id"]
    patch "/api/v1/documents/#{id}", params: { document: { title: "Plan B" } }, headers: @headers, as: :json

    get "/api/v1/activities", params: { subject_type: "Document", subject_id: id }, headers: @headers

    assert_response :success
    assert_equal [ [ "updated", { "title" => [ "Plan", "Plan B" ] } ], [ "created", {} ] ], response.parsed_body.map { |entry| [ entry["action"], entry["changes"] ] }
  end

  test "another space's item has no visible log" do
    other = User.create!(name: "O", email: "o-activity-api@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")

    get "/api/v1/activities", params: { subject_type: "Task", subject_id: theirs.id }, headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body

    get "/api/v1/activities", params: { subject_type: "Task", subject_id: theirs.id }, headers: @headers.merge("X-Workspace-Id" => other.workspace.id.to_s)
    assert_response :not_found
  end

  test "a viewer can read the log" do
    owner = User.create!(name: "Owner", email: "owner-activity-api@example.com", password: "password123")
    team = Workspace.create!(name: "Team", user: owner)
    team.memberships.create!(user: @user, role: :viewer)
    Current.user = owner
    task = team.tasks.create!(title: "Ship")

    get "/api/v1/activities", params: { subject_type: "Task", subject_id: task.id }, headers: @headers.merge("X-Workspace-Id" => team.id.to_s)

    assert_response :success
    assert_equal [ [ "created", "Owner" ] ], response.parsed_body.map { |entry| [ entry["action"], entry["actor_name"] ] }
  end

  test "an unknown kind of item is not found" do
    get "/api/v1/activities", params: { subject_type: "User", subject_id: @user.id }, headers: @headers
    assert_response :not_found
  end

  test "signing in is required" do
    get "/api/v1/activities", params: { subject_type: "Task", subject_id: 1 }
    assert_response :unauthorized
  end
end
