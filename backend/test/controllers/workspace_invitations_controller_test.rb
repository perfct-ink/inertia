require "test_helper"

class WorkspaceInvitationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-invapi@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "admin-invapi@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-invapi@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def path(*rest) = "/api/v1/workspaces/#{@team.id}/invitations#{rest.map { |r| "/#{r}" }.join}"

  test "an admin invites an email, lists it and revokes it" do
    post path, params: { email: "new@example.com", role: "member" }, headers: headers_for(@admin), as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert response.parsed_body["token"].present?

    get path, headers: headers_for(@admin)
    assert_equal [ "new@example.com" ], response.parsed_body.map { |i| i["email"] }

    delete path(id), headers: headers_for(@admin)
    assert_response :no_content
    assert_equal 0, @team.invitations.count
  end

  test "a member cannot invite or list invitations" do
    post path, params: { email: "new@example.com" }, headers: headers_for(@member), as: :json
    assert_response :forbidden
    get path, headers: headers_for(@member)
    assert_response :forbidden
  end

  test "only an owner can invite an owner" do
    post path, params: { email: "boss@example.com", role: "owner" }, headers: headers_for(@admin), as: :json
    assert_response :forbidden
    post path, params: { email: "boss@example.com", role: "owner" }, headers: headers_for(@owner), as: :json
    assert_response :created
  end

  test "a duplicate invitation gives a validation error" do
    2.times { post path, params: { email: "dup@example.com" }, headers: headers_for(@owner), as: :json }
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].join, "already been invited"
  end

  test "the invited person signs up, accepts the link and joins with the role" do
    invitation = @team.invitations.create!(email: "ada-invapi@example.com", role: "admin")
    ada = User.create!(name: "Ada", email: "ada-invapi@example.com", password: "password123")

    post "/api/v1/invitations/#{invitation.token}/accept", headers: headers_for(ada), as: :json
    assert_response :success
    assert_equal @team.id, response.parsed_body["id"]
    assert_equal "admin", response.parsed_body["role"]
    assert @team.memberships.find_by(user: ada).admin?

    post "/api/v1/invitations/#{invitation.token}/accept", headers: headers_for(ada), as: :json
    assert_response :not_found
  end

  test "someone with another email or a made-up token gets not found" do
    invitation = @team.invitations.create!(email: "ada-invapi@example.com")
    post "/api/v1/invitations/#{invitation.token}/accept", headers: headers_for(@member), as: :json
    assert_response :not_found
    assert_not_includes @team.reload.members.map(&:email), "ada-invapi@example.com"
    post "/api/v1/invitations/nope/accept", headers: headers_for(@member), as: :json
    assert_response :not_found
  end
end
