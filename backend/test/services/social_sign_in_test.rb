require "test_helper"

class SocialSignInTest < ActiveSupport::TestCase
  setup do
    @old_client = ENV["GOOGLE_CLIENT_ID"]
    @old_secret = ENV["GOOGLE_CLIENT_SECRET"]
    @old_base = ENV["OAUTH_CALLBACK_BASE_URL"]
    ENV.update("GOOGLE_CLIENT_ID" => "test-client", "GOOGLE_CLIENT_SECRET" => "test-secret", "OAUTH_CALLBACK_BASE_URL" => "http://localhost:3000")
    @service = Auth::SocialSignIn.new("google")
    @key = OpenSSL::PKey::RSA.generate(2048)
    @jwk = JWT::JWK.new(@key, "test-key")
    @attempt = SocialLoginAttempt.new(nonce: "expected-nonce", provider_verifier: SecureRandom.urlsafe_base64(32))
    @claims = { "iss" => "https://accounts.google.com", "aud" => "test-client", "sub" => "stable-subject", "nonce" => "expected-nonce", "exp" => 5.minutes.from_now.to_i, "email" => "provider@example.com", "email_verified" => true }
  end

  teardown do
    { "GOOGLE_CLIENT_ID" => @old_client, "GOOGLE_CLIENT_SECRET" => @old_secret, "OAUTH_CALLBACK_BASE_URL" => @old_base }.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  test "provider tokens require valid signature audience issuer expiration and nonce" do
    stub_provider(@claims)
    assert_equal "stable-subject", @service.claims("provider-code", @attempt)["sub"]
    [ { "aud" => "other-app" }, { "iss" => "https://attacker.example" }, { "exp" => 1.minute.ago.to_i }, { "nonce" => "other-nonce" }, { "sub" => nil } ].each do |invalid|
      stub_provider(@claims.merge(invalid))
      assert_raises(Auth::SocialSignIn::Error) { @service.claims("provider-code", @attempt) }
    end
    stub_provider(@claims, signing_key: OpenSSL::PKey::RSA.generate(2048))
    assert_raises(Auth::SocialSignIn::Error) { @service.claims("provider-code", @attempt) }
  end

  test "identities reuse the provider subject even when email changes or is omitted" do
    user = @service.user_for(@claims)
    assert user.workspace.present?
    assert_equal user, @service.user_for(@claims.except("email", "email_verified"))
    assert_equal 1, user.social_identities.count
  end

  test "existing password accounts are never silently linked by email" do
    user = User.create!(name: "Existing", email: @claims["email"], password: "password123")
    assert_raises(Auth::SocialSignIn::Error) { @service.user_for(@claims) }
    assert_empty user.social_identities
  end

  test "new accounts require a verified email" do
    assert_no_difference "User.count" do
      assert_raises(Auth::SocialSignIn::Error) { @service.user_for(@claims.merge("email_verified" => false)) }
    end
  end

  test "apple uses form post and requires a public HTTPS callback" do
    previous = %w[APPLE_CLIENT_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY].to_h { |key| [ key, ENV[key] ] }
    previous.each_key { |key| ENV[key] = "test" }
    apple = Auth::SocialSignIn.new("apple")
    assert_raises(Auth::SocialSignIn::NotConfigured) { apple.configured! }
    ENV["OAUTH_CALLBACK_BASE_URL"] = "https://login.example.com"
    apple.configured!
    params = URI.decode_www_form(URI(apple.authorization_url(@attempt, "state")).query).to_h
    assert_equal "form_post", params["response_mode"]
    assert_equal "https://login.example.com/api/v1/auth/social/apple/callback", params["redirect_uri"]
  ensure
    previous&.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end

  private

  def stub_provider(claims, signing_key: @key)
    token = JWT.encode(claims, signing_key, "RS256", { kid: "test-key" })
    keys = JSON.parse({ keys: [ @jwk.export ] }.to_json)
    @service.define_singleton_method(:json_request) do |url, _form = nil|
      url.include?("/token") ? { "id_token" => token } : keys
    end
  end
end
