require "test_helper"

class SprintsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-sprint-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "start then close with carry-over reports what moved" do
    sprint = @workspace.sprints.create!(title: "S1")
    nxt = @workspace.sprints.create!(title: "S2")
    @workspace.tasks.create!(title: "A", sprint: sprint, status: :done)
    open_task = @workspace.tasks.create!(title: "B", sprint: sprint, status: :todo)

    post "/api/v1/sprints/#{sprint.id}/start", headers: @headers, as: :json
    assert_response :success
    assert_equal "active", response.parsed_body["status"]

    post "/api/v1/sprints/#{sprint.id}/close", params: { carry_to_sprint_id: nxt.id }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ 1, 1, "done" ], [ response.parsed_body["completed"], response.parsed_body["carried_over"], response.parsed_body["sprint"]["status"] ]
    assert_equal nxt, open_task.reload.sprint
  end

  test "invalid transitions return an error" do
    sprint = @workspace.sprints.create!(title: "S1")
    post "/api/v1/sprints/#{sprint.id}/close", headers: @headers, as: :json
    assert_response :unprocessable_entity
    sprint.start!
    post "/api/v1/sprints/#{sprint.id}/start", headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's sprint or carry target is not found" do
    other = User.create!(name: "O", email: "o-sprint-api@example.com", password: "password123")
    theirs = other.workspace.sprints.create!(title: "Theirs")
    post "/api/v1/sprints/#{theirs.id}/start", headers: @headers, as: :json
    assert_response :not_found
    mine = @workspace.sprints.create!(title: "Mine")
    mine.start!
    post "/api/v1/sprints/#{mine.id}/close", params: { carry_to_sprint_id: theirs.id }, headers: @headers, as: :json
    assert_response :not_found
  end
end
