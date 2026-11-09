require "test_helper"

class NotificationsControllerTest < ActionDispatch::IntegrationTest
  include ActiveJob::TestHelper

  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @previous_adapter = ActiveJob::Base.queue_adapter
    ActiveJob::Base.queue_adapter = :test
    @user = User.create!(name: "Pat", email: "pat-inbox@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @workspace = @user.workspace
    @first = Notification.notify(recipient: @user, workspace: @workspace, kind: "x", title: "First")
    @second = Notification.notify(recipient: @user, workspace: @workspace, kind: "x", title: "Second")
  end

  teardown do
    ENV["BYPASS_AUTH"] = @previous_bypass
    ActiveJob::Base.queue_adapter = @previous_adapter
  end

  test "lists my notifications newest first with the unread count" do
    get "/api/v1/notifications", headers: @headers
    assert_response :success
    assert_equal 2, response.parsed_body["unread_count"]
    assert_equal [ "Second", "First" ], response.parsed_body["notifications"].map { |n| n["title"] }
  end

  test "marks one read, then all read" do
    patch "/api/v1/notifications/#{@first.id}", headers: @headers, as: :json
    assert_response :success
    assert response.parsed_body["read_at"]
    get "/api/v1/notifications", headers: @headers
    assert_equal 1, response.parsed_body["unread_count"]

    post "/api/v1/notifications/read_all", headers: @headers, as: :json
    assert_response :no_content
    get "/api/v1/notifications", headers: @headers
    assert_equal 0, response.parsed_body["unread_count"]
  end

  test "other people's notifications are not visible or changeable" do
    other = User.create!(name: "O", email: "o-inbox@example.com", password: "password123")
    theirs = Notification.notify(recipient: other, workspace: other.workspace, kind: "x", title: "Theirs")
    get "/api/v1/notifications", headers: @headers
    assert_not_includes response.parsed_body["notifications"].map { |n| n["title"] }, "Theirs"
    patch "/api/v1/notifications/#{theirs.id}", headers: @headers, as: :json
    assert_response :not_found
  end

  test "opening the inbox queues a check-in request for me, which asks me once about a check-in that is due" do
    task = @workspace.tasks.create!(title: "Keep watch", ongoing: true, check_in_recurrence: "FREQ=DAILY", assignee: @user)
    task.update_columns(last_check_in_at: 5.days.ago)
    assert_enqueued_with(job: TaskCheckInRequestJob, args: [ @user.id ]) do
      get "/api/v1/notifications", headers: @headers
    end

    perform_enqueued_jobs { get "/api/v1/notifications", headers: @headers }
    asked = response.parsed_body["notifications"].select { |n| n["kind"] == "check_in_requested" }
    assert_equal [ "Check in on “Keep watch”" ], asked.map { |n| n["title"] }

    perform_enqueued_jobs { get "/api/v1/notifications", headers: @headers }
    assert_equal 1, response.parsed_body["notifications"].count { |n| n["kind"] == "check_in_requested" }, "not asked twice"
  end

  test "signed-out requests are rejected" do
    get "/api/v1/notifications"
    assert_response :unauthorized
  end
end
