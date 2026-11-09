require "test_helper"

# The sign-up contract the Mac app (macos/Sources/InertiaCore/Signup.swift) and the web
# sign-up screen both rely on: 201 with the JWT in the Authorization header, or 422 with
# full validation messages in "errors".
class SignupApiTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }
  def sign_up(overrides = {})
    post "/api/v1/auth/signup",
         params: { user: { name: "Ada", email: "ada-signup@example.com", password: "password123", password_confirmation: "password123" }.merge(overrides) },
         as: :json
  end

  test "signing up returns the user and a bearer token, and creates the personal Space" do
    sign_up
    assert_response :created
    assert response.headers.fetch("Authorization").start_with?("Bearer ")
    user = User.find(response.parsed_body.dig("user", "id"))
    assert_equal "ada-signup@example.com", user.email
    assert user.workspace.personal?
  end

  test "the token from sign-up authenticates later calls" do
    sign_up
    get "/api/v1/workspaces", headers: { "Authorization" => response.headers.fetch("Authorization") }, as: :json
    assert_response :success
  end

  test "a taken email comes back as a message that starts with the field" do
    User.create!(name: "First", email: "ada-signup@example.com", password: "password123")
    sign_up
    assert_response :unprocessable_entity
    assert_includes response.parsed_body.fetch("errors"), "Email has already been taken"
    assert_nil response.headers["Authorization"]
  end

  test "a short password and a blank name each come back as messages" do
    sign_up(password: "123", password_confirmation: "123", name: "")
    assert_response :unprocessable_entity
    errors = response.parsed_body.fetch("errors")
    assert errors.any? { |message| message.start_with?("Password ") }
    assert errors.any? { |message| message.start_with?("Name ") }
  end
end
