require "test_helper"

class HolidaysControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Pat", email: "pat-hol-api@example.com", password: "password123")
    @admin = User.create!(name: "Ada", email: "admin-hol-api@example.com", password: "password123")
    @member = User.create!(name: "Mo", email: "member-hol-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-hol-api@example.com", password: "password123")
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

  def holiday_params(**attrs)
    { holiday: { name: "Thanksgiving", start_date: "2026-11-26", end_date: "2026-11-27" }.merge(attrs) }
  end

  test "an admin adds a holiday and anyone in the space can read the list in date order" do
    @team.holidays.create!(name: "Christmas", start_date: "2026-12-25", end_date: "2026-12-25")

    post "/api/v1/holidays", params: holiday_params, headers: headers_for(@admin), as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal "Thanksgiving", body["name"]
    assert_equal "2026-11-26", body["start_date"]
    assert_equal "2026-11-27", body["end_date"]

    get "/api/v1/holidays", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ "Thanksgiving", "Christmas" ], response.parsed_body.map { |h| h["name"] }
  end

  test "a holiday can be changed and removed" do
    record = @team.holidays.create!(name: "Fall break", start_date: "2026-11-02", end_date: "2026-11-02")

    patch "/api/v1/holidays/#{record.id}", params: { holiday: { name: "Autumn break", end_date: "2026-11-03" } }, headers: headers_for(@owner), as: :json
    assert_response :success
    assert_equal "Autumn break", response.parsed_body["name"]
    assert_equal "2026-11-03", response.parsed_body["end_date"]

    delete "/api/v1/holidays/#{record.id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not Holiday.exists?(record.id)
  end

  test "members and viewers can read holidays but not change them" do
    record = @team.holidays.create!(name: "Fall break", start_date: "2026-11-02", end_date: "2026-11-02")

    [ @member, @viewer ].each do |user|
      post "/api/v1/holidays", params: holiday_params, headers: headers_for(user), as: :json
      assert_response :forbidden
      patch "/api/v1/holidays/#{record.id}", params: { holiday: { name: "x" } }, headers: headers_for(user), as: :json
      assert_response :forbidden
      delete "/api/v1/holidays/#{record.id}", headers: headers_for(user)
      assert_response :forbidden
    end
    assert_equal "Fall break", record.reload.name
  end

  test "invalid holidays are rejected with the reason" do
    post "/api/v1/holidays", params: holiday_params(name: ""), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Name can't be blank"

    post "/api/v1/holidays", params: holiday_params(start_date: "2026-11-27", end_date: "2026-11-26"), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "End date can't be before the start date"
  end

  test "holidays are scoped to the selected space" do
    @team.holidays.create!(name: "Team day", start_date: "2026-11-02", end_date: "2026-11-02")
    record = @team.holidays.create!(name: "Other day", start_date: "2026-11-03", end_date: "2026-11-03")

    get "/api/v1/holidays", headers: headers_for(@owner, workspace: @owner.workspace)
    assert_response :success
    assert_empty response.parsed_body

    patch "/api/v1/holidays/#{record.id}", params: { holiday: { name: "Moved" } }, headers: headers_for(@owner, workspace: @owner.workspace), as: :json
    assert_response :not_found
  end

  test "someone outside the space cannot see them" do
    outsider = User.create!(name: "Out", email: "outsider-hol-api@example.com", password: "password123")
    get "/api/v1/holidays", headers: headers_for(outsider)
    assert_response :not_found
  end
end
