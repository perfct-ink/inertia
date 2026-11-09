require "test_helper"

class TaskCheckInsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-checkin-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create an ongoing task, check in with a status and a note, and read the log" do
    post "/api/v1/tasks", params: { task: { title: "Keep watch", ongoing: true, check_in_recurrence: "FREQ=WEEKLY;INTERVAL=2" } }, headers: @headers, as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal [ true, "FREQ=WEEKLY;INTERVAL=2", false, nil ], [ body["ongoing"], body["check_in_recurrence"], body["check_in_stale"], body["check_in_status"] ]
    assert_equal (Date.current + 14).to_s, body["check_in_due_on"]
    id = body["id"]

    post "/api/v1/tasks/#{id}/check_ins", params: { check_in: { status: "at_risk", note: "Waiting on the vendor" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ "at_risk", "Waiting on the vendor", "Pat" ], response.parsed_body.values_at("status", "note", "author_name")

    post "/api/v1/tasks/#{id}/check_ins", params: { check_in: { status: "on_track" } }, headers: @headers, as: :json
    assert_response :created
    assert_nil response.parsed_body["note"]

    get "/api/v1/tasks/#{id}/check_ins", headers: @headers
    assert_equal [ [ "at_risk", "Waiting on the vendor" ], [ "on_track", nil ] ], response.parsed_body.map { |c| c.values_at("status", "note") }

    get "/api/v1/tasks", headers: @headers
    assert_equal "on_track", response.parsed_body.find { |t| t["id"] == id }["check_in_status"], "the latest status shows on the task"
  end

  test "an ongoing task without a schedule, or with an unsupported one, is rejected" do
    post "/api/v1/tasks", params: { task: { title: "Keep watch", ongoing: true } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tasks", params: { task: { title: "Keep watch", ongoing: true, check_in_recurrence: "FREQ=HOURLY" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "a check-in without a valid status is rejected" do
    task = @user.workspace.tasks.create!(title: "T", ongoing: true, check_in_recurrence: "FREQ=DAILY")
    post "/api/v1/tasks/#{task.id}/check_ins", params: { check_in: { note: "No status" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tasks/#{task.id}/check_ins", params: { check_in: { status: "great" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal 0, task.check_ins.count
  end

  test "an ongoing task is stale once its check-in is overdue" do
    task = @user.workspace.tasks.create!(title: "T", ongoing: true, check_in_recurrence: "FREQ=DAILY")
    task.update_columns(last_check_in_at: 3.days.ago)
    get "/api/v1/tasks", headers: @headers
    assert response.parsed_body.find { |t| t["id"] == task.id }["check_in_stale"]

    post "/api/v1/tasks/#{task.id}/check_ins", params: { check_in: { status: "on_track" } }, headers: @headers, as: :json
    get "/api/v1/tasks", headers: @headers
    assert_not response.parsed_body.find { |t| t["id"] == task.id }["check_in_stale"]
  end

  test "a task that is not ongoing takes no check-ins" do
    task = @user.workspace.tasks.create!(title: "Plain")
    post "/api/v1/tasks/#{task.id}/check_ins", params: { check_in: { status: "on_track" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's task is not found" do
    other = User.create!(name: "O", email: "o-checkin-api2@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")
    get "/api/v1/tasks/#{theirs.id}/check_ins", headers: @headers
    assert_response :not_found
    post "/api/v1/tasks/#{theirs.id}/check_ins", params: { check_in: { status: "on_track" } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
