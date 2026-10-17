require "test_helper"

# The roadmap screen reads initiatives and epics and moves them between
# Now / Next / Later by patching `horizon` (PM-20 to PM-22).
class RoadmapApiTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-roadmap-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "initiatives serve health and accept a horizon" do
    initiative = @user.workspace.initiatives.create!(title: "Growth", target_date: Date.current - 1)
    @user.workspace.tasks.create!(title: "t", epic: @user.workspace.epics.create!(title: "E", initiative: initiative))

    get "/api/v1/initiatives", headers: @headers
    body = response.parsed_body.first
    assert_equal "off_track", body["health"]
    assert_nil body["horizon"]

    patch "/api/v1/initiatives/#{initiative.id}", params: { initiative: { horizon: "later" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "later", response.parsed_body["horizon"]

    patch "/api/v1/initiatives/#{initiative.id}", params: { initiative: { horizon: "someday" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "epics accept and clear a horizon" do
    epic = @user.workspace.epics.create!(title: "E")
    patch "/api/v1/epics/#{epic.id}", params: { epic: { horizon: "now" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "now", response.parsed_body["horizon"]

    patch "/api/v1/epics/#{epic.id}", params: { epic: { horizon: nil } }, headers: @headers, as: :json
    assert_response :success
    assert_nil response.parsed_body["horizon"]
  end
end
