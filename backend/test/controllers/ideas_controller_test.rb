require "test_helper"

class IdeasControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-idea-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "submit, list, decline and promote an idea" do
    post "/api/v1/ideas", params: { idea: { title: "Dark mode", description: "Please" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal "Pat", response.parsed_body["submitted_by_name"]
    id = response.parsed_body["id"]

    patch "/api/v1/ideas/#{id}", params: { idea: { status: "declined" } }, headers: @headers, as: :json
    assert_equal "declined", response.parsed_body["status"]
    patch "/api/v1/ideas/#{id}", params: { idea: { status: "promoted" } }, headers: @headers, as: :json
    assert_equal "declined", response.parsed_body["status"]

    patch "/api/v1/ideas/#{id}", params: { idea: { status: "open" } }, headers: @headers, as: :json
    post "/api/v1/ideas/#{id}/promote", params: { to: "initiative" }, headers: @headers, as: :json
    assert_response :created
    assert_equal "promoted", response.parsed_body["idea"]["status"]
    assert_equal "Initiative", response.parsed_body["idea"]["promoted_type"]
    assert_equal 1, @user.workspace.initiatives.count

    post "/api/v1/ideas/#{id}/promote", params: { to: "epic" }, headers: @headers, as: :json
    assert_response :unprocessable_entity

    get "/api/v1/ideas", headers: @headers
    assert_equal [ "Dark mode" ], response.parsed_body.map { |i| i["title"] }
  end

  test "a blank title is rejected and another space's idea is not found" do
    post "/api/v1/ideas", params: { idea: { title: "" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    other = User.create!(name: "O", email: "o-idea-api@example.com", password: "password123")
    theirs = other.workspace.ideas.create!(title: "Theirs")
    post "/api/v1/ideas/#{theirs.id}/promote", params: { to: "epic" }, headers: @headers, as: :json
    assert_response :not_found
  end
end
