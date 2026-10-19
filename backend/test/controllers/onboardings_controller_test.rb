require "test_helper"

class OnboardingsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-onboarding-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(@user, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}" }
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  test "starts empty, then stores and returns the progress" do
    get "/api/v1/onboarding", headers: @headers
    assert_nil response.parsed_body["onboarding"]

    put "/api/v1/onboarding", params: { onboarding: { dismissed: false, done: %w[space document] } }, headers: @headers, as: :json
    assert_response :success
    assert_equal({ "dismissed" => false, "done" => %w[space document] }, response.parsed_body["onboarding"])

    put "/api/v1/onboarding", params: { onboarding: { dismissed: true, done: %w[space document sheet] } }, headers: @headers, as: :json
    get "/api/v1/onboarding", headers: @headers
    assert_equal true, response.parsed_body["onboarding"]["dismissed"]
    assert_equal %w[space document sheet], response.parsed_body["onboarding"]["done"]
  end

  test "an unknown step is rejected" do
    put "/api/v1/onboarding", params: { onboarding: { dismissed: false, done: %w[teleport] } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_nil @user.reload.onboarding
  end

  test "progress belongs to the person: another user does not see it" do
    put "/api/v1/onboarding", params: { onboarding: { dismissed: true, done: [] } }, headers: @headers, as: :json
    other = User.create!(name: "O", email: "o-onboarding-api@example.com", password: "password123")
    token, = Warden::JWTAuth::UserEncoder.new.call(other, :user, nil)
    get "/api/v1/onboarding", headers: { "Authorization" => "Bearer #{token}" }
    assert_nil response.parsed_body["onboarding"]
  end

  test "signed-out requests are rejected" do
    get "/api/v1/onboarding"
    assert_response :unauthorized
  end
end
