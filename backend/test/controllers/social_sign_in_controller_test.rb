require "test_helper"
require "minitest/mock"

class SocialSignInControllerTest < ActionDispatch::IntegrationTest
  setup do
    @keys = %w[GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET OAUTH_CALLBACK_BASE_URL BYPASS_AUTH]
    @previous = @keys.to_h { |key| [ key, ENV[key] ] }
    ENV.update("GOOGLE_CLIENT_ID" => "test-client", "GOOGLE_CLIENT_SECRET" => "test-secret", "OAUTH_CALLBACK_BASE_URL" => "http://localhost:3000", "BYPASS_AUTH" => "false")
    @verifier = SecureRandom.urlsafe_base64(32)
    @state = SecureRandom.urlsafe_base64(32)
  end

  teardown { @previous.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value } }

  test "start binds state and proof key without needing a password session" do
    start_sign_in
    assert_response :success
    uri = URI(response.parsed_body.fetch("authorization_url"))
    query = URI.decode_www_form(uri.query).to_h
    assert_equal "accounts.google.com", uri.host
    assert_equal "S256", query["code_challenge_method"]
    attempt = SocialLoginAttempt.find_by!(state_digest: SocialLoginAttempt.digest(query["state"]))
    assert_equal @state, attempt.client_state
    assert_equal Auth::SocialSignIn.challenge(@verifier), attempt.code_challenge
    assert_equal Auth::SocialSignIn.challenge(attempt.provider_verifier), query["code_challenge"]
    assert_equal attempt.nonce, query["nonce"]
  end

  test "missing configuration and invalid proof keys fail clearly" do
    ENV.delete("GOOGLE_CLIENT_SECRET")
    start_sign_in
    assert_response :service_unavailable
    assert_includes response.parsed_body["error"], "not configured"
    ENV["GOOGLE_CLIENT_SECRET"] = "test-secret"
    post "/api/v1/auth/social/google/start", params: { state: @state, code_challenge: "invalid" }, as: :json
    assert_response :unauthorized
  end

  test "successful browser callback yields a one-use proof-bound code and a valid Inertia JWT" do
    start_sign_in
    provider_state = URI.decode_www_form(URI(response.parsed_body["authorization_url"]).query).to_h.fetch("state")
    service = Auth::SocialSignIn.new("google")
    service.stub(:claims, { "sub" => "google-test-user", "email" => "social-new@example.com", "email_verified" => true, "name" => "Social User" }) do
      Auth::SocialSignIn.stub(:new, service) do
        get "/api/v1/auth/social/google/callback", params: { state: provider_state, code: "provider-code" }
      end
    end
    assert_response :redirect
    target = URI(response.location)
    assert_equal "com.inertia.native", target.scheme
    values = URI.decode_www_form(target.query).to_h
    assert_equal @state, values["state"]
    assert_nil values["token"]
    code = values.fetch("code")

    post "/api/v1/auth/social/exchange", params: { code: code, code_verifier: SecureRandom.urlsafe_base64(32) }, as: :json
    assert_response :unauthorized
    post "/api/v1/auth/social/exchange", params: { code: code, code_verifier: @verifier }, as: :json
    assert_response :success
    token = response.headers.fetch("Authorization")
    assert token.start_with?("Bearer ")
    assert_equal "social-new@example.com", response.parsed_body.dig("user", "email")
    get "/api/v1/workspace", headers: { "Authorization" => token }
    assert_response :success
    post "/api/v1/auth/social/exchange", params: { code: code, code_verifier: @verifier }, as: :json
    assert_response :unauthorized
    get "/api/v1/auth/social/google/callback", params: { state: provider_state, code: "provider-code" }
    assert_response :unauthorized
    delete "/api/v1/auth/logout", headers: { "Authorization" => token }
    assert_response :success
    get "/api/v1/workspace", headers: { "Authorization" => token }
    assert_response :unauthorized
  end

  test "denial returns to the app with state but unknown state never redirects" do
    start_sign_in
    provider_state = URI.decode_www_form(URI(response.parsed_body["authorization_url"]).query).to_h.fetch("state")
    post "/api/v1/auth/social/google/callback", params: { state: provider_state, error: "access_denied" }
    assert_response :redirect
    values = URI.decode_www_form(URI(response.location).query).to_h
    assert_equal @state, values["state"]
    assert_includes values["error"], "canceled"
    get "/api/v1/auth/social/google/callback", params: { state: "forged", code: "provider-code" }
    assert_response :not_found
  end

  test "expired exchange codes cannot authenticate" do
    user = User.create!(name: "Expired", email: "expired-social@example.com", password: "password123")
    attempt = SocialLoginAttempt.create!(provider: "google", state_digest: SecureRandom.hex(32), client_state: @state,
      code_challenge: Auth::SocialSignIn.challenge(@verifier), nonce: SecureRandom.hex(32), provider_verifier: @verifier,
      user: user, exchange_digest: SocialLoginAttempt.digest("old-code"), expires_at: 1.minute.ago)
    post "/api/v1/auth/social/exchange", params: { code: "old-code", code_verifier: @verifier }, as: :json
    assert_response :unauthorized
    assert_nil attempt.reload.exchanged_at
  end

  private

  def start_sign_in
    post "/api/v1/auth/social/google/start", params: { state: @state, code_challenge: Auth::SocialSignIn.challenge(@verifier) }, as: :json
  end
end
