require "test_helper"
require "minitest/mock"

class DevelopmentLoginTest < ActionDispatch::IntegrationTest
  setup do
    @user = User.find_or_initialize_by(email: "test@example.com")
    @user.name = "Test User"
    @user.password = "password123"
    @user.save!
  end

  test "admin admin authenticates the seeded user in development" do
    Rails.stub(:env, ActiveSupport::StringInquirer.new("development")) do
      post "/api/v1/auth/login", params: { user: { email: "admin", password: "admin" } }, as: :json
      assert_response :success
      assert_equal @user.id, response.parsed_body.dig("user", "id")
      assert response.headers.fetch("Authorization").start_with?("Bearer ")
    end
  end

  test "admin shortcut is rejected outside development" do
    %w[test production].each do |environment|
      Rails.stub(:env, ActiveSupport::StringInquirer.new(environment)) do
        post "/api/v1/auth/login", params: { user: { email: "admin", password: "admin" } }, as: :json
        assert_response :unauthorized
      end
    end
  end

  test "incorrect admin password is rejected in development" do
    Rails.stub(:env, ActiveSupport::StringInquirer.new("development")) do
      post "/api/v1/auth/login", params: { user: { email: "admin", password: "wrong" } }, as: :json
      assert_response :unauthorized
    end
  end

  test "existing email and password sign-in is preserved" do
    post "/api/v1/auth/login", params: { user: { email: "test@example.com", password: "password123" } }, as: :json
    assert_response :success
    assert_equal @user.id, response.parsed_body.dig("user", "id")
  end
end
