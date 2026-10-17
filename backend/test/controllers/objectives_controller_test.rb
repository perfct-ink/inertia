require "test_helper"

class ObjectivesControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-okr-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "create an objective, add and update key results, and list them nested" do
    post "/api/v1/objectives", params: { objective: { title: "Grow", target_date: "2026-12-31" } }, headers: @headers, as: :json
    assert_response :created
    objective_id = response.parsed_body["id"]

    post "/api/v1/key_results", params: { key_result: { objective_id: objective_id, title: "Signups", target_value: 1000, unit: "users" } }, headers: @headers, as: :json
    assert_response :created
    kr_id = response.parsed_body["id"]

    patch "/api/v1/key_results/#{kr_id}", params: { key_result: { current_value: 250 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal 25, response.parsed_body["percent"]

    get "/api/v1/objectives", headers: @headers
    body = response.parsed_body.first
    assert_equal 25, body["percent"]
    assert_equal 0.25, body["score"]
    assert_equal [ [ "Signups", 250.0, 1000.0 ] ], body["key_results"].map { |kr| [ kr["title"], kr["current_value"], kr["target_value"] ] }

    delete "/api/v1/key_results/#{kr_id}", headers: @headers
    assert_response :no_content
    delete "/api/v1/objectives/#{objective_id}", headers: @headers
    assert_response :no_content
  end

  test "key results of another space's objective are not found" do
    other = User.create!(name: "O", email: "o-okr-api@example.com", password: "password123")
    objective = other.workspace.objectives.create!(title: "Theirs")
    kr = objective.key_results.create!(title: "x", target_value: 1)
    post "/api/v1/key_results", params: { key_result: { objective_id: objective.id, title: "y", target_value: 1 } }, headers: @headers, as: :json
    assert_response :not_found
    patch "/api/v1/key_results/#{kr.id}", params: { key_result: { current_value: 1 } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
