require "test_helper"

class TaskStatusSettingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-status-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-status-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @workspace = @user.workspace
    @folder = @workspace.folders.create!(name: "Project")
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def response_rows
    response.parsed_body.map { |row| [ row["folder_id"], row["status"], row["label"], row["color"] ] }
  end

  test "set the Space default, list it and reset it" do
    get "/api/v1/task_status_settings", headers: @headers
    assert_response :success
    assert_equal [], response.parsed_body

    put "/api/v1/task_status_settings", params: { statuses: [ { status: "in_progress", label: "Doing", color: "orange" }, { status: "done", color: "purple" } ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ [ nil, "in_progress", "Doing", "orange" ], [ nil, "done", nil, "purple" ] ], response_rows

    delete "/api/v1/task_status_settings", headers: @headers
    assert_response :no_content
    assert_equal 0, @workspace.task_status_settings.count
  end

  test "a folder's board has its own settings that replace the previous ones" do
    @workspace.task_status_settings.create!(status: :todo, label: "Space todo")

    put "/api/v1/task_status_settings", params: { folder_id: @folder.id, statuses: [ { status: "todo", label: "Queued" } ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ [ nil, "todo", "Space todo", nil ], [ @folder.id, "todo", "Queued", nil ] ], response_rows

    put "/api/v1/task_status_settings", params: { folder_id: @folder.id, statuses: [ { status: "done", color: "blue" } ] }, headers: @headers, as: :json
    assert_equal [ [ nil, "todo", "Space todo", nil ], [ @folder.id, "done", nil, "blue" ] ], response_rows

    delete "/api/v1/task_status_settings", params: { folder_id: @folder.id }, headers: @headers
    assert_response :no_content
    assert_equal [ [ nil, "todo", "Space todo" ] ], @workspace.task_status_settings.pluck(:folder_id, :status, :label)
  end

  test "Root's settings are the Space default" do
    put "/api/v1/task_status_settings", params: { folder_id: @workspace.root_folder_id, statuses: [ { status: "todo", label: "Queued" } ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ [ nil, "todo", "Queued", nil ] ], response_rows
  end

  test "an invalid entry is a 422 and changes nothing" do
    @workspace.task_status_settings.create!(status: :todo, label: "Keep me")

    put "/api/v1/task_status_settings", params: { statuses: [ { status: "done", label: "Shipped" }, { status: "in_review", color: "pink" } ] }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert response.parsed_body["errors"].any?

    put "/api/v1/task_status_settings", params: { statuses: [ { status: "done", label: "A" }, { status: "done", label: "B" } ] }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    put "/api/v1/task_status_settings", params: { statuses: [ { status: "stuck", label: "Stuck" } ] }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    assert_equal [ "Keep me" ], @workspace.task_status_settings.pluck(:label)
  end

  test "sending no statuses clears the board" do
    @workspace.task_status_settings.create!(status: :todo, label: "Queued")
    put "/api/v1/task_status_settings", params: { statuses: [] }, headers: @headers, as: :json
    assert_response :success
    assert_equal [], response.parsed_body
  end

  test "a folder from another space is not found" do
    foreign = @team.folders.create!(name: "Team folder")
    put "/api/v1/task_status_settings", params: { folder_id: foreign.id, statuses: [ { status: "todo", label: "Queued" } ] }, headers: @headers, as: :json
    assert_response :not_found
  end

  test "settings are scoped to the selected space and viewers cannot change them" do
    @team.task_status_settings.create!(status: :todo, label: "Team todo")
    @workspace.task_status_settings.create!(status: :todo, label: "Mine")

    get "/api/v1/task_status_settings", headers: @headers
    assert_equal [ "Mine" ], response.parsed_body.map { |row| row["label"] }

    get "/api/v1/task_status_settings", headers: headers_for(@viewer, workspace: @team)
    assert_response :success
    assert_equal [ "Team todo" ], response.parsed_body.map { |row| row["label"] }

    put "/api/v1/task_status_settings", params: { statuses: [ { status: "todo", label: "Nope" } ] }, headers: headers_for(@viewer, workspace: @team), as: :json
    assert_response :forbidden

    delete "/api/v1/task_status_settings", headers: headers_for(@viewer, workspace: @team)
    assert_response :forbidden
    assert_equal 1, @team.task_status_settings.count
  end

  test "tasks keep their status whatever it is called" do
    task = @workspace.tasks.create!(title: "T", status: :in_progress)
    put "/api/v1/task_status_settings", params: { statuses: [ { status: "in_progress", label: "Doing" } ] }, headers: @headers, as: :json

    get "/api/v1/tasks", headers: @headers
    assert_equal [ [ task.id, "in_progress" ] ], response.parsed_body.map { |t| [ t["id"], t["status"] ] }
  end
end
