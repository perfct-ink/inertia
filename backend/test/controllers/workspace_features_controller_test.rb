require "test_helper"

class WorkspaceFeaturesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-features-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "a new Space can start with a chosen set of features" do
    post "/api/v1/workspaces", params: { workspace: { name: "Band", features: %w[events roadmap] } }, headers: @headers, as: :json
    assert_response :created
    assert_equal %w[events roadmap], response.parsed_body["features"]
  end

  test "the Space owner can change the features, and the payload lists every feature by default" do
    get "/api/v1/workspace", headers: @headers
    assert_equal Workspace::FEATURES, response.parsed_body["features"]

    patch "/api/v1/workspace", params: { workspace: { features: %w[okrs] } }, headers: @headers, as: :json
    assert_response :success
    assert_equal %w[okrs], response.parsed_body["features"]
  end

  test "unknown features return an error" do
    patch "/api/v1/workspace", params: { workspace: { features: %w[bogus] } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "a plain member cannot change the features" do
    owner = User.create!(name: "Owner", email: "owner-features-api@example.com", password: "password123")
    space = owner.workspace
    space.memberships.create!(user: @user, role: :member)
    patch "/api/v1/workspace", params: { workspace: { features: [] } }, headers: @headers.merge("X-Workspace-Id" => space.id.to_s), as: :json
    assert_response :forbidden
  end
end
