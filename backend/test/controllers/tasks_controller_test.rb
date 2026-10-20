require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-tasks-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "a task is created with a kind and defaults to task" do
    post "/api/v1/tasks", params: { task: { title: "Crash on save", kind: "bug" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "bug", response.parsed_body["kind"]

    post "/api/v1/tasks", params: { task: { title: "Plain" } }, headers: @headers, as: :json
    assert_equal "task", response.parsed_body["kind"]
  end

  test "an unknown kind is rejected rather than stored" do
    post "/api/v1/tasks", params: { task: { title: "Odd", kind: "epic" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "the bugs queue is the task list filtered by kind" do
    @user.workspace.tasks.create!(title: "Bug one", kind: :bug)
    @user.workspace.tasks.create!(title: "A story", kind: :story)
    @user.workspace.tasks.create!(title: "A task")

    get "/api/v1/tasks", params: { kind: "bug" }, headers: @headers
    assert_response :success
    assert_equal [ "Bug one" ], response.parsed_body.map { |t| t["title"] }

    get "/api/v1/tasks", headers: @headers
    assert_equal 3, response.parsed_body.size
  end
end
