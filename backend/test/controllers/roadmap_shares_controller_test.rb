require "test_helper"

class RoadmapSharesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-roadmap-share@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    workspace = @user.workspace
    milestone = workspace.milestones.create!(title: "Beta", target_date: Date.new(2026, 12, 1), description: "private notes", owner: @user)
    initiative = workspace.initiatives.create!(title: "Onboarding", milestone: milestone, description: "secret", owner: @user, start_date: Date.new(2026, 11, 1), target_date: Date.new(2026, 11, 30))
    epic = workspace.epics.create!(title: "Tour", initiative: initiative)
    workspace.tasks.create!(title: "Do it", epic: epic, status: :done)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "creating a link is idempotent, and anyone with the token reads the roadmap without signing in" do
    get "/api/v1/roadmap_share", headers: @headers
    assert_nil response.parsed_body

    post "/api/v1/roadmap_share", headers: @headers, as: :json
    assert_response :created
    token = response.parsed_body["token"]
    post "/api/v1/roadmap_share", headers: @headers, as: :json
    assert_equal token, response.parsed_body["token"]
    assert_equal 1, Share.count

    get "/api/v1/shared/#{token}"
    assert_response :success
    roadmap = response.parsed_body["resource"]["roadmap"]
    assert_equal [ "Beta" ], roadmap["milestones"].map { |m| m["title"] }
    assert_equal [ "Onboarding" ], roadmap["initiatives"].map { |i| i["title"] }
    assert_equal [ [ "Tour", 1, 1 ] ], roadmap["epics"].map { |e| [ e["title"], e["tasks_count"], e["done_tasks_count"] ] }
  end

  test "the public payload leaves out descriptions and owners" do
    post "/api/v1/roadmap_share", headers: @headers, as: :json
    get "/api/v1/shared/#{response.parsed_body['token']}"
    body = response.body
    assert_not_includes body, "secret"
    assert_not_includes body, "private notes"
    assert_not_includes body, "owner_id"
  end

  test "revoking the link stops access" do
    post "/api/v1/roadmap_share", headers: @headers, as: :json
    token = response.parsed_body["token"]
    delete "/api/v1/roadmap_share", headers: @headers
    assert_response :no_content
    get "/api/v1/shared/#{token}"
    assert_response :not_found
  end

  test "signed-out requests cannot manage the link" do
    post "/api/v1/roadmap_share", as: :json
    assert_response :unauthorized
  end
end
