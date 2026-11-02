require "test_helper"

class TasksEstimatesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-estimates-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "priority, estimate and story points are accepted and returned" do
    post "/api/v1/tasks", params: { task: { title: "Ship", priority: "high", estimate_hours: 6.5, story_points: 5 } }, headers: @headers, as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal [ "high", 6.5, 5, nil ], [ body["priority"], body["estimate_hours"], body["story_points"], body["actual_story_points"] ]

    patch "/api/v1/tasks/#{body['id']}", params: { task: { actual_story_points: 8 } }, headers: @headers, as: :json
    assert_equal 8, response.parsed_body["actual_story_points"]
  end

  test "a bad priority or a negative estimate returns an error" do
    post "/api/v1/tasks", params: { task: { title: "Ship", priority: "someday" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/tasks", params: { task: { title: "Ship", estimate_hours: -2 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end
end
