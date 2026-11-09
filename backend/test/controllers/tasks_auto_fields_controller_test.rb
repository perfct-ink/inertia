require "test_helper"

# The fields the server fills in on a task: item ID, creator, created and
# last updated (docs/features/task_auto_fields.md).
class TasksAutoFieldsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-auto-fields@example.com", password: "password123")
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
    other = User.create!(name: "Bo", email: "bo-auto-fields@example.com", password: "password123")
    post "/api/v1/tasks", params: { task: { title: "Ship", created_by_id: other.id } }, headers: @headers, as: :json
    assert_equal @user.id, response.parsed_body["created_by_id"]
  end

  test "an update keeps the creator and moves the last updated time" do
    task = @user.workspace.tasks.create!(title: "Ship", created_by: @user, updated_at: 3.days.ago)
    patch "/api/v1/tasks/#{task.id}", params: { task: { title: "Ship it", created_by_id: nil } }, headers: @headers, as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal @user.id, body["created_by_id"]
    assert_operator Time.zone.parse(body["updated_at"]), :>, 1.day.ago
  end

  test "the list shows each task's creator, and none for a task made before creators were recorded" do
    made = @user.workspace.tasks.create!(title: "New", created_by: @user)
    old = @user.workspace.tasks.create!(title: "Old")
    get "/api/v1/tasks", headers: @headers
    rows = response.parsed_body.index_by { |t| t["id"] }
    assert_equal "Pat", rows[made.id]["created_by_name"]
    assert_nil rows[old.id]["created_by_id"]
    assert_nil rows[old.id]["created_by_name"]
  end

  test "deleting the creator keeps the task and clears the creator" do
    other = User.create!(name: "Bo", email: "bo-auto-fields-2@example.com", password: "password123")
    task = @user.workspace.tasks.create!(title: "Ship", created_by: other)
    other.destroy
    assert_nil task.reload.created_by_id
  end
end
