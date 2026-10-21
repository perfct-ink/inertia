require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-tasks-api@example.com", password: "password123")
    @other = User.create!(name: "Bo", email: "bo-tasks-api@example.com", password: "password123")
    @outsider = User.create!(name: "Cy", email: "cy-tasks-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @other, role: :member)
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @team.id.to_s }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "a task is created and updated with several assignees and watchers" do
    post "/api/v1/tasks", params: { task: { title: "Ship", assignee_ids: [ @user.id, @other.id ], watcher_ids: [ @other.id ] } }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ @user.id, @other.id ], response.parsed_body["assignee_ids"]
    assert_equal [ @other.id ], response.parsed_body["watcher_ids"]
    assert_equal @user.id, response.parsed_body["assignee_id"]

    patch "/api/v1/tasks/#{response.parsed_body['id']}", params: { task: { assignee_ids: [ @other.id ] } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ @other.id ], response.parsed_body["assignee_ids"]
  end

  test "someone outside the Space cannot be assigned" do
    post "/api/v1/tasks", params: { task: { title: "Ship", assignee_ids: [ @outsider.id ] } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_empty @team.tasks.reload
  end

  test "the list filters by assignee" do
    @team.tasks.create!(title: "Mine", assignee_ids: [ @user.id, @other.id ])
    @team.tasks.create!(title: "Theirs", assignee_ids: [ @other.id ])
    @team.tasks.create!(title: "Nobody's")

    get "/api/v1/tasks", params: { assignee_id: @user.id }, headers: @headers
    assert_equal [ "Mine" ], response.parsed_body.map { |t| t["title"] }
  end
end
