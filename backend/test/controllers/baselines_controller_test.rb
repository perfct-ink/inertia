require "test_helper"

class BaselinesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-baseline-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @folder = @user.workspace.folders.create!(name: "Plan")
    @user.workspace.tasks.create!(title: "A", folder: @folder, start_date: Date.new(2026, 11, 1), due_date: Date.new(2026, 11, 5))
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create, list and delete a baseline" do
    post "/api/v1/folders/#{@folder.id}/baselines", params: { baseline: { name: "Kickoff" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal [ "2026-11-05" ], response.parsed_body["tasks"].map { |t| t["due_date"] }
    id = response.parsed_body["id"]

    get "/api/v1/folders/#{@folder.id}/baselines", headers: @headers
    assert_equal [ "Kickoff" ], response.parsed_body.map { |b| b["name"] }

    delete "/api/v1/baselines/#{id}", headers: @headers
    assert_response :no_content
  end

  test "a blank name is rejected" do
    post "/api/v1/folders/#{@folder.id}/baselines", params: { baseline: { name: "" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's folder and baseline are not found" do
    other = User.create!(name: "O", email: "o-baseline-api@example.com", password: "password123")
    folder = other.workspace.folders.create!(name: "Theirs")
    baseline = Baseline.snapshot!(folder: folder, name: "x")
    post "/api/v1/folders/#{folder.id}/baselines", params: { baseline: { name: "y" } }, headers: @headers, as: :json
    assert_response :not_found
    delete "/api/v1/baselines/#{baseline.id}", headers: @headers
    assert_response :not_found
  end
end
