require "test_helper"

class ResourceAllocationsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Pat", email: "pat-ra-api@example.com", password: "password123")
    @admin = User.create!(name: "Ada", email: "admin-ra-api@example.com", password: "password123")
    @member = User.create!(name: "Mo", email: "member-ra-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-ra-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @project = @team.folders.create!(name: "Messages", kind: :project)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def allocation_params(**attrs)
    { resource_allocation: { user_id: @member.id, folder_id: @project.id, hours_per_week: 12.5, start_date: "2026-11-02" }.merge(attrs) }
  end

  test "an admin allocates a person to a project and anyone in the space can read the plan" do
    post "/api/v1/resource_allocations", params: allocation_params, headers: headers_for(@admin), as: :json
    assert_response :created
    body = response.parsed_body
    assert_equal 12.5, body["hours_per_week"]
    assert_equal @member.id, body["user_id"]
    assert_equal @project.id, body["folder_id"]
    assert_equal "2026-11-02", body["start_date"]
    assert_nil body["end_date"]

    get "/api/v1/resource_allocations", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ body["id"] ], response.parsed_body.map { |a| a["id"] }
  end

  test "an allocation can be changed and removed" do
    allocation = @team.resource_allocations.create!(user: @member, folder: @project, hours_per_week: 10)

    patch "/api/v1/resource_allocations/#{allocation.id}", params: { resource_allocation: { hours_per_week: 20, end_date: "2026-12-04" } }, headers: headers_for(@owner), as: :json
    assert_response :success
    assert_equal 20, response.parsed_body["hours_per_week"]
    assert_equal "2026-12-04", response.parsed_body["end_date"]

    delete "/api/v1/resource_allocations/#{allocation.id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_not ResourceAllocation.exists?(allocation.id)
  end

  test "members and viewers can read but not change the plan" do
    allocation = @team.resource_allocations.create!(user: @member, folder: @project, hours_per_week: 10)

    [ @member, @viewer ].each do |user|
      post "/api/v1/resource_allocations", params: allocation_params, headers: headers_for(user), as: :json
      assert_response :forbidden
      patch "/api/v1/resource_allocations/#{allocation.id}", params: { resource_allocation: { hours_per_week: 1 } }, headers: headers_for(user), as: :json
      assert_response :forbidden
      delete "/api/v1/resource_allocations/#{allocation.id}", headers: headers_for(user)
      assert_response :forbidden
    end
    assert_equal 10, allocation.reload.hours_per_week
  end

  test "invalid allocations are rejected with the reason" do
    stranger = User.create!(name: "Stranger", email: "stranger-ra-api@example.com", password: "password123")
    post "/api/v1/resource_allocations", params: allocation_params(user_id: stranger.id), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Person must be a member of the space"

    post "/api/v1/resource_allocations", params: allocation_params(hours_per_week: 0), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    plain = @team.folders.create!(name: "Notes")
    post "/api/v1/resource_allocations", params: allocation_params(folder_id: plain.id), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Project must be a project"

    foreign = @owner.workspace.folders.create!(name: "Mine", kind: :project)
    post "/api/v1/resource_allocations", params: allocation_params(folder_id: foreign.id), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    post "/api/v1/resource_allocations", params: allocation_params(start_date: "2026-12-04", end_date: "2026-11-02"), headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
  end

  test "allocations are scoped to the selected space" do
    @team.resource_allocations.create!(user: @member, folder: @project, hours_per_week: 10)
    allocation = @team.resource_allocations.create!(user: @owner, folder: @project, hours_per_week: 5)

    get "/api/v1/resource_allocations", headers: headers_for(@owner, workspace: @owner.workspace)
    assert_response :success
    assert_empty response.parsed_body

    patch "/api/v1/resource_allocations/#{allocation.id}", params: { resource_allocation: { hours_per_week: 1 } }, headers: headers_for(@owner, workspace: @owner.workspace), as: :json
    assert_response :not_found
  end

  test "someone outside the space cannot see it" do
    outsider = User.create!(name: "Out", email: "outsider-ra-api@example.com", password: "password123")
    get "/api/v1/resource_allocations", headers: headers_for(outsider)
    assert_response :not_found
  end
end
