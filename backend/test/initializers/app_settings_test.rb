require "test_helper"

class AppSettingsTest < ActiveSupport::TestCase
  KEYS = %w[BYPASS_AUTH WEB_URL APP_URL OAUTH_CALLBACK_BASE_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET APPLE_CLIENT_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY].freeze

  setup { @previous = KEYS.to_h { |key| [ key, ENV[key] ] } }
  teardown { @previous.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value } }

  def production!
    Rails.env.stub(:production?, true) { yield }
  end

  test "the sign-in bypass follows BYPASS_AUTH outside production" do
    ENV["BYPASS_AUTH"] = "true"
    assert AppSettings.bypass_auth?
    ENV["BYPASS_AUTH"] = "false"
    assert_not AppSettings.bypass_auth?
    ENV.delete("BYPASS_AUTH")
    assert_not AppSettings.bypass_auth?
  end

  test "the sign-in bypass is ignored in production, whatever the variable says" do
    ENV["BYPASS_AUTH"] = "true"
    production! { assert_not AppSettings.bypass_auth? }
  end

  test "a request in production does not run as the first user even with BYPASS_AUTH=true" do
    User.create!(name: "Pat", email: "bypass-pat@example.com", password: "password123")
    ENV["BYPASS_AUTH"] = "true"
    production! do
      integration = ActionDispatch::Integration::Session.new(Rails.application)
      integration.get "/api/v1/workspace"
      assert_equal 401, integration.response.status
    end
  end

  test "web and app URLs have their defaults" do
    ENV.delete("WEB_URL")
    ENV.delete("APP_URL")
    assert_equal "", AppSettings.web_url
    assert_equal "http://localhost:3847", AppSettings.app_url
    ENV["WEB_URL"] = "http://localhost:5174"
    assert_equal "http://localhost:5174", AppSettings.web_url
  end

  test "social credentials are the provider's settings, nil when unset" do
    ENV["GOOGLE_CLIENT_ID"] = "id"
    ENV.delete("GOOGLE_CLIENT_SECRET")
    assert_equal({ client_id: "id", client_secret: nil }, AppSettings.social_credentials("google"))
    assert_equal [ "GOOGLE_CLIENT_SECRET" ], AppSettings.missing_social_variables("google")
    assert_equal({}, AppSettings.social_credentials("github"))
  end

  test "blank values count as unset" do
    ENV["APPLE_CLIENT_ID"] = ""
    assert_nil AppSettings.social_credentials("apple")[:client_id]
    assert_includes AppSettings.missing_social_variables("apple"), "APPLE_CLIENT_ID"
  end

  test "no application code reads ENV" do
    offenders = Dir[Rails.root.join("app/**/*.rb"), Rails.root.join("lib/**/*.rb")].select { |file| File.read(file).match?(/\bENV\b/) }
    assert_empty offenders.map { |file| file.sub("#{Rails.root}/", "") }
  end
end
