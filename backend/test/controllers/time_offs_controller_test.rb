require "test_helper"

class TimeOffsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Pat", email: "pat-to-api@example.com", password: "password123")
    @admin = User.create!(name: "Ada", email: "admin-to-api@example.com", password: "password123")
    @member = User.create!(name: "Mo", email: "member-to-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-to-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def time_off_params(**attrs)
    { time_off: { user_id: @member.id, start_date: "2026-11-09", end_date: "2026-11-10", note: "Conference" }.merge(attrs) }
  end

  test "an admin records time off and anyone in the space can read it, but only admins see the note" do
    post "/api/v1/time_offs", params: time_off_params, headers: headers_for(@admin), as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal @member.id, body["user_id"]
    assert_equal "2026-11-09", body["start_date"]
    assert_equal "2026-11-10", body["end_date"]
    assert_equal "Conference", body["note"]

    get "/api/v1/time_offs", headers: headers_for(@admin)
    assert_equal [ "Conference" ], response.parsed_body.map { |t| t["note"] }

    get "/api/v1/time_offs", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ body["id"] ], response.parsed_body.map { |t| t["id"] }
    assert_nil response.parsed_body.first["note"]

    get "/api/v1/time_offs", headers: headers_for(@member)
    assert_nil response.parsed_body.first["note"]
  end

  test "time off can be changed and removed" do
    record = @team.time_offs.create!(user: @member, start_date: "2026-11-09", end_date: "2026-11-09")

    patch "/api/v1/time_offs/#{record.id}", params: { time_off: { end_date: "2026-11-13", note: "Trip" } }, headers: headers_for(@owner), as: :json
    assert_response :success
    assert_equal "2026-11-13", response.parsed_body["end_date"]
    assert_equal "Trip", response.parsed_body["note"]

    delete "/api/v1/time_offs/#{record.id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not TimeOff.exists?(record.id)
  end

  test "members and viewers cannot record time off, even their own" do
    record = @team.time_offs.create!(user: @member, start_date: "2026-11-09", end_date: "2026-11-09")

    [ @member, @viewer ].each do |user|
      post "/api/v1/time_offs", params: time_off_params, headers: headers_for(user), as: :json
      assert_response :forbidden
      patch "/api/v1/time_offs/#{record.id}", params: { time_off: { end_date: "2026-11-20" } }, headers: headers_for(user), as: :json
      assert_response :forbidden
      delete "/api/v1/time_offs/#{record.id}", headers: headers_for(user)
      assert_response :forbidden
    end
    assert_equal Date.new(2026, 11, 9), record.reload.end_date
  end

  test "invalid time off is rejected with the reason" do
    stranger = User.create!(name: "Stranger", email: "stranger-to-api@example.com", password: "password123")
    post "/api/v1/time_offs", params: time_off_params(user_id: stranger.id), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Person must be a member of the space"

    post "/api/v1/time_offs", params: time_off_params(start_date: "2026-11-10", end_date: "2026-11-09"), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "End date can't be before the start date"

    post "/api/v1/time_offs", params: time_off_params(start_date: nil), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
  end

  test "time off is scoped to the selected space" do
    @team.time_offs.create!(user: @member, start_date: "2026-11-09", end_date: "2026-11-09")
    record = @team.time_offs.create!(user: @owner, start_date: "2026-11-16", end_date: "2026-11-16")

    get "/api/v1/time_offs", headers: headers_for(@owner, workspace: @owner.workspace)
    assert_response :success
    assert_empty response.parsed_body

    patch "/api/v1/time_offs/#{record.id}", params: { time_off: { note: "Moved" } }, headers: headers_for(@owner, workspace: @owner.workspace), as: :json
    assert_response :not_found
  end

  test "someone outside the space cannot see it" do
    outsider = User.create!(name: "Out", email: "outsider-to-api@example.com", password: "password123")
    get "/api/v1/time_offs", headers: headers_for(outsider)
    assert_response :not_found
  end
end
