require "test_helper"

class TaskStatusChangesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-history-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "the history lists each change with who made it" do
    post "/api/v1/tasks", params: { task: { title: "Ship", status: "todo" } }, headers: @headers, as: :json
    id = response.parsed_body["id"]
    patch "/api/v1/tasks/#{id}", params: { task: { status: "done" } }, headers: @headers, as: :json

    get "/api/v1/tasks/#{id}/status_changes", headers: @headers
    assert_response :success
    assert_equal [ [ nil, "todo", "Pat" ], [ "todo", "done", "Pat" ] ], response.parsed_body.map { |c| [ c["from_status"], c["to_status"], c["changed_by_name"] ] }
  end

  test "another space's task is not found" do
    other = User.create!(name: "O", email: "o-history-api@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")
    get "/api/v1/tasks/#{theirs.id}/status_changes", headers: @headers
    assert_response :not_found
  end

  # GET /api/v1/task_status_changes: every task's history in one list, for the agile reports.
  test "the Space's changes are listed with their task, oldest first, without who made them" do
    first = @user.workspace.tasks.create!(title: "First")
    second = @user.workspace.tasks.create!(title: "Second")
    first.update!(status: "done")
    other = User.create!(name: "O", email: "o-history-list@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")

    get "/api/v1/task_status_changes", headers: @headers
    assert_response :success
    body = response.parsed_body.select { |c| [ first.id, second.id ].include?(c["task_id"]) }
    assert_equal [ [ first.id, nil, "todo" ], [ second.id, nil, "todo" ], [ first.id, "todo", "done" ] ], body.map { |c| [ c["task_id"], c["from_status"], c["to_status"] ] }
    assert_not body.first.key?("changed_by_name")
    assert body.first["created_at"].present?
    assert_not_includes response.parsed_body.map { |c| c["task_id"] }, theirs.id
  end

  test "the changes can be narrowed to one sprint" do
    sprint = @user.workspace.sprints.create!(title: "Sprint 1")
    inside = @user.workspace.tasks.create!(title: "In", sprint: sprint)
    @user.workspace.tasks.create!(title: "Out")

    get "/api/v1/task_status_changes", params: { sprint_id: sprint.id }, headers: @headers
    assert_response :success
    assert_equal [ inside.id ], response.parsed_body.map { |c| c["task_id"] }.uniq
  end

  test "the changes can be narrowed to the open project" do
    project = @user.workspace.folders.create!(name: "Messages")
    filed = @user.workspace.tasks.create!(title: "Filed", folder: project)
    @user.workspace.tasks.create!(title: "Elsewhere")

    get "/api/v1/task_status_changes", headers: @headers.merge("X-Project-Id" => project.id.to_s)
    assert_response :success
    assert_equal [ filed.id ], response.parsed_body.map { |c| c["task_id"] }.uniq
  end

  test "another space's sprint or project gives nothing or is not found" do
    other = User.create!(name: "O", email: "o-history-list2@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs", sprint: other.workspace.sprints.create!(title: "S"))

    get "/api/v1/task_status_changes", params: { sprint_id: theirs.sprint_id }, headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body

    get "/api/v1/task_status_changes", headers: @headers.merge("X-Project-Id" => other.workspace.folders.create!(name: "P").id.to_s)
    assert_response :not_found
  end
end
