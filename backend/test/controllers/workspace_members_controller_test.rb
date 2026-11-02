require "test_helper"

class WorkspaceMembersControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "admin@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member@example.com", password: "password123")
    @newcomer = User.create!(name: "Newcomer", email: "newcomer@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @admin_membership = @team.memberships.create!(user: @admin, role: :admin)
    @member_membership = @team.memberships.create!(user: @member, role: :member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}" }
  end

  def members_path(*rest)
    "/api/v1/workspaces/#{@team.id}/members#{rest.map { |r| "/#{r}" }.join}"
  end

  test "any member lists the members" do
    get members_path, headers: headers_for(@member)
    assert_response :success
    assert_equal %w[admin@example.com member@example.com owner@example.com], response.parsed_body.map { |m| m["user"]["email"] }.sort
  end

  test "a non-member cannot see the workspace" do
    get members_path, headers: headers_for(@newcomer)
    assert_response :not_found
  end

  test "an admin adds an existing user by email" do
    post members_path, params: { email: "Newcomer@Example.com", role: "member" }, headers: headers_for(@admin), as: :json
    assert_response :created
    assert_equal "member", @team.memberships.find_by!(user: @newcomer).role
  end

  test "adding an unknown email or an existing member is rejected" do
    post members_path, params: { email: "nobody@example.com" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    post members_path, params: { email: "member@example.com" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
  end

  test "a plain member cannot add people" do
    post members_path, params: { email: "newcomer@example.com" }, headers: headers_for(@member), as: :json
    assert_response :forbidden
  end

  test "only an owner can grant the owner role" do
    post members_path, params: { email: "newcomer@example.com", role: "owner" }, headers: headers_for(@admin), as: :json
    assert_response :forbidden

    post members_path, params: { email: "newcomer@example.com", role: "owner" }, headers: headers_for(@owner), as: :json
    assert_response :created
  end

  test "an admin changes a member's role but cannot touch an owner" do
    patch members_path(@member_membership.id), params: { role: "viewer" }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert @member_membership.reload.viewer?

    owner_membership = @team.memberships.find_by!(user: @owner)
    patch members_path(owner_membership.id), params: { role: "member" }, headers: headers_for(@admin), as: :json
    assert_response :forbidden
  end

  test "the last owner cannot be demoted or removed" do
    owner_membership = @team.memberships.find_by!(user: @owner)
    patch members_path(owner_membership.id), params: { role: "admin" }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity

    delete members_path(owner_membership.id), headers: headers_for(@owner)
    assert_response :unprocessable_entity
  end

  test "a member can leave and an admin can remove a member" do
    delete members_path(@member_membership.id), headers: headers_for(@member)
    assert_response :no_content

    @team.memberships.create!(user: @newcomer, role: :member)
    newcomer_membership = @team.memberships.find_by!(user: @newcomer)
    delete members_path(newcomer_membership.id), headers: headers_for(@admin)
    assert_response :no_content
  end

  test "a plain member cannot remove someone else" do
    delete members_path(@admin_membership.id), headers: headers_for(@member)
    assert_response :forbidden
  end

  test "the member list shows each person's weekly capacity, 40 hours by default" do
    get members_path, headers: headers_for(@member)
    assert_equal [ 40.0 ], response.parsed_body.map { |m| m["weekly_capacity_hours"] }.uniq
  end

  test "an admin sets a member's weekly capacity without touching their role" do
    patch members_path(@member_membership.id), params: { weekly_capacity_hours: 22.5 }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal 22.5, response.parsed_body["weekly_capacity_hours"]
    assert_equal "member", response.parsed_body["role"]
    assert_equal 22.5, @member_membership.reload.weekly_capacity_hours.to_f
  end

  test "capacity and role can be changed together" do
    patch members_path(@member_membership.id), params: { role: "viewer", weekly_capacity_hours: 0 }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert @member_membership.reload.viewer?
    assert_equal 0, @member_membership.weekly_capacity_hours
  end

  test "a capacity outside a week is rejected and a plain member cannot set one" do
    patch members_path(@member_membership.id), params: { weekly_capacity_hours: 200 }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    patch members_path(@member_membership.id), params: { weekly_capacity_hours: "lots" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    patch members_path(@member_membership.id), params: { weekly_capacity_hours: 10 }, headers: headers_for(@member), as: :json
    assert_response :forbidden
    assert_equal 40, @member_membership.reload.weekly_capacity_hours
  end
end
