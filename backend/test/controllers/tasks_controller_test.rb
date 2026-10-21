require "test_helper"

class TasksControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-tasks-auto@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "a new task records who created it and its timestamps" do
    post "/api/v1/tasks", params: { task: { title: "Ship" } }, headers: @headers, as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal @user.id, body["created_by_id"]
    assert_equal "Pat", body["created_by_name"]
    assert body["created_at"].present?
    assert body["updated_at"].present?
  end

  test "the creator cannot be set from the request" do
    other = User.create!(name: "Bo", email: "bo-tasks-auto@example.com", password: "password123")
    post "/api/v1/tasks", params: { task: { title: "Ship", created_by_id: other.id } }, headers: @headers, as: :json
    assert_equal @user.id, response.parsed_body["created_by_id"]
  end

  test "a task made before creators were recorded has no creator name" do
    task = @user.workspace.tasks.create!(title: "Old")
    get "/api/v1/tasks", headers: @headers
    row = response.parsed_body.find { |t| t["id"] == task.id }
    assert_nil row["created_by_id"]
    assert_nil row["created_by_name"]
  end
end
