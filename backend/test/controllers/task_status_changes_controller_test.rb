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
end
