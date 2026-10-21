require "test_helper"

class TimeEntriesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-time-api@example.com", password: "password123")
    @other = User.create!(name: "Bo", email: "bo-time-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @other, role: :member)
    @task = @team.tasks.create!(title: "Ship")
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @team.id.to_s }
  end

  test "start a timer, see it on the task, stop it" do
    post "/api/v1/tasks/#{@task.id}/time_entries", headers: @headers, as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert_nil response.parsed_body["ended_at"]

    get "/api/v1/tasks", headers: @headers
    row = response.parsed_body.first
    assert row["timer_started_at"].present?
    assert_equal id, row["timer_entry_id"]
    assert_equal 0, row["logged_minutes"]

    post "/api/v1/time_entries/#{id}/stop", headers: @headers, as: :json
    assert_response :success
    assert response.parsed_body["ended_at"].present?

    get "/api/v1/tasks", headers: @headers
    assert_nil response.parsed_body.first["timer_started_at"]
  end

  test "only the signed-in user's own timer shows as theirs" do
    @task.time_entries.create!(user: @other, started_at: Time.current)
    get "/api/v1/tasks", headers: @headers
    assert_nil response.parsed_body.first["timer_started_at"]
  end

  test "logging minutes adds finished time to the task total" do
    post "/api/v1/tasks/#{@task.id}/time_entries", params: { time_entry: { minutes: 45 } }, headers: @headers, as: :json
    assert_response :created
    assert_equal 45, response.parsed_body["minutes"]
    @task.time_entries.create!(user: @other, started_at: 30.minutes.ago, ended_at: Time.current)

    get "/api/v1/tasks", headers: @headers
    assert_equal 75, response.parsed_body.first["logged_minutes"]
  end

  test "zero minutes and a second running timer are rejected" do
    post "/api/v1/tasks/#{@task.id}/time_entries", params: { time_entry: { minutes: 0 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    post "/api/v1/tasks/#{@task.id}/time_entries", headers: @headers, as: :json
    post "/api/v1/tasks/#{@task.id}/time_entries", headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_match(/Stop your running timer/, response.parsed_body["errors"].first)
  end

  test "nobody can stop or delete someone else's entry" do
    entry = @task.time_entries.create!(user: @other, started_at: Time.current)
    post "/api/v1/time_entries/#{entry.id}/stop", headers: @headers, as: :json
    assert_response :not_found
    delete "/api/v1/time_entries/#{entry.id}", headers: @headers
    assert_response :not_found
  end

  test "a viewer cannot start a timer" do
    viewer = User.create!(name: "Vi", email: "vi-time-api@example.com", password: "password123")
    @team.memberships.create!(user: viewer, role: :viewer)
    post "/api/v1/tasks/#{@task.id}/time_entries", headers: headers_for(viewer), as: :json
    assert_response :forbidden
  end
end
