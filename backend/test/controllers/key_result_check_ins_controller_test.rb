require "test_helper"

class KeyResultCheckInsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-checkin-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
    @kr = @user.workspace.objectives.create!(title: "Grow").key_results.create!(title: "Signups", target_value: 100)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "adding a check-in updates the value and lists newest first" do
    post "/api/v1/key_results/#{@kr.id}/check_ins", params: { check_in: { value: 30, note: "First" } }, headers: @headers, as: :json
    assert_response :created
    assert_equal 30.0, response.parsed_body["value"]
    post "/api/v1/key_results/#{@kr.id}/check_ins", params: { check_in: { value: 30, note: "Same" } }, headers: @headers, as: :json
    assert_response :created
    post "/api/v1/key_results/#{@kr.id}/check_ins", params: { check_in: { value: 55 } }, headers: @headers, as: :json
    assert_equal 55.0, @kr.reload.current_value

    get "/api/v1/key_results/#{@kr.id}/check_ins", headers: @headers
    assert_equal [ 55.0, 30.0, 30.0 ], response.parsed_body.map { |c| c["value"] }
    assert_equal "Pat", response.parsed_body.first["author_name"]
  end

  test "patching the current value also records a check-in" do
    patch "/api/v1/key_results/#{@kr.id}", params: { key_result: { current_value: 12 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ 12 ], @kr.check_ins.map { |c| c.value.to_i }
  end

  test "another space's key result is not found" do
    other = User.create!(name: "O", email: "o-checkin-api@example.com", password: "password123")
    kr = other.workspace.objectives.create!(title: "Theirs").key_results.create!(title: "x", target_value: 1)
    get "/api/v1/key_results/#{kr.id}/check_ins", headers: @headers
    assert_response :not_found
    post "/api/v1/key_results/#{kr.id}/check_ins", params: { check_in: { value: 1 } }, headers: @headers, as: :json
    assert_response :not_found
  end
end
