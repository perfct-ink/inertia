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

  test "create an ongoing task, answer it, and read the log" do
    post "/api/v1/tasks", params: { task: { title: "Keep watch", ongoing: true, check_in_every_days: 3 } }, headers: @headers, as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal [ true, 3, false ], [ body["ongoing"], body["check_in_every_days"], body["check_in_stale"] ]
    id = body["id"]

    post "/api/v1/tasks/#{id}/check_ins", params: { check_in: { body: "All good this week" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "Pat", response.parsed_body["author_name"]

    get "/api/v1/tasks/#{id}/check_ins", headers: @headers
    assert_equal [ "All good this week" ], response.parsed_body.map { |c| c["body"] }
  end

  test "an ongoing task without an interval, and a blank update, are rejected" do
    post "/api/v1/tasks", params: { task: { title: "Keep watch", ongoing: true } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    task = @user.workspace.tasks.create!(title: "T", ongoing: true, check_in_every_days: 3)
    post "/api/v1/tasks/#{task.id}/check_ins", params: { check_in: { body: "" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's task is not found" do
    other = User.create!(name: "O", email: "o-checkin-api2@example.com", password: "password123")
    theirs = other.workspace.tasks.create!(title: "Theirs")
    get "/api/v1/tasks/#{theirs.id}/check_ins", headers: @headers
    assert_response :not_found
    post "/api/v1/tasks/#{theirs.id}/check_ins", params: { check_in: { body: "x" } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
