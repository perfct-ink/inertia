require "test_helper"

class TeamsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "teams-owner@example.com", password: "password123")
    @admin = User.create!(name: "Admin", email: "teams-admin@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "teams-member@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "teams-ada@example.com", password: "password123")
    @bo = User.create!(name: "Bo", email: "teams-bo@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @owner)
    @space.memberships.create!(user: @admin, role: :admin)
    @space.memberships.create!(user: @member, role: :member)
    @design = @space.teams.create!(name: "Design", role: :member)
    @design_ada = @design.memberships.create!(user: @ada)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  def teams_path(*rest)
    "/api/v1/workspaces/#{@space.id}/teams#{rest.map { |r| "/#{r}" }.join}"
  end

  test "any member lists the teams with their people" do
    get teams_path, headers: headers_for(@member)
    assert_response :success
    team = response.parsed_body.sole
    assert_equal "Design", team["name"]
    assert_equal "member", team["role"]
    assert_equal [ "teams-ada@example.com" ], team["members"].map { |m| m["user"]["email"] }
  end

  test "a person on a team can list the teams too" do
    get teams_path, headers: headers_for(@ada)
    assert_response :success
    assert_equal [ "Design" ], response.parsed_body.map { |t| t["name"] }
  end

  test "someone outside the space cannot see its teams" do
    get teams_path, headers: headers_for(@bo)
    assert_response :not_found
  end

  test "an admin creates a team" do
    post teams_path, params: { team: { name: "Writers", role: "viewer" } }, headers: headers_for(@admin), as: :json
    assert_response :created
    assert_equal "viewer", response.parsed_body["role"]
    assert_equal [], response.parsed_body["members"]
    assert @space.teams.exists?(name: "Writers")
  end

  test "a team defaults to the member role" do
    post teams_path, params: { team: { name: "Writers" } }, headers: headers_for(@owner), as: :json
    assert_response :created
    assert_equal "member", response.parsed_body["role"]
  end

  test "a plain member cannot create, change or delete teams" do
    post teams_path, params: { team: { name: "Writers" } }, headers: headers_for(@member), as: :json
    assert_response :forbidden

    patch teams_path(@design.id), params: { team: { role: "admin" } }, headers: headers_for(@member), as: :json
    assert_response :forbidden

    delete teams_path(@design.id), headers: headers_for(@member)
    assert_response :forbidden
    assert Team.exists?(@design.id)
  end

  test "a team cannot be an owner, nameless or a duplicate" do
    post teams_path, params: { team: { name: "Bosses", role: "owner" } }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity

    post teams_path, params: { team: { name: "" } }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity

    post teams_path, params: { team: { name: "design" } }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
    assert_equal 1, @space.teams.count
  end

  test "a personal space cannot have teams" do
    post "/api/v1/workspaces/#{@owner.workspace.id}/teams", params: { team: { name: "Solo" } }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "A personal space cannot have teams"
  end

  test "an admin renames a team and changes its role" do
    patch teams_path(@design.id), params: { team: { name: "Product design", role: "admin" } }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal "Product design", @design.reload.name
    assert @design.admin?

    patch teams_path(@design.id), params: { team: { role: "owner" } }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert @design.reload.admin?
  end

  test "deleting a team takes its people's access away" do
    delete teams_path(@design.id), headers: headers_for(@admin)
    assert_response :no_content
    assert_not Team.exists?(@design.id)
    assert_not TeamMembership.exists?(@design_ada.id)

    get "/api/v1/workspace", headers: headers_for(@ada, workspace: @space)
    assert_response :not_found
  end

  test "another space's teams cannot be reached through this space" do
    other = Workspace.create!(name: "Other", user: @owner)
    stranger = other.teams.create!(name: "Strangers")
    patch teams_path(stranger.id), params: { team: { name: "Mine" } }, headers: headers_for(@owner), as: :json
    assert_response :not_found
    assert_equal "Strangers", stranger.reload.name
  end

  test "an admin adds an existing user by email and the user gets the team's role" do
    get "/api/v1/workspace", headers: headers_for(@bo, workspace: @space)
    assert_response :not_found

    post teams_path(@design.id, "members"), params: { email: " Teams-Bo@Example.com " }, headers: headers_for(@admin), as: :json
    assert_response :created
    assert_equal %w[teams-ada@example.com teams-bo@example.com], response.parsed_body["members"].map { |m| m["user"]["email"] }.sort

    get "/api/v1/workspace", headers: headers_for(@bo, workspace: @space)
    assert_response :success
    assert_equal "member", response.parsed_body["role"]
  end

  test "adding an unknown email or someone already on the team is rejected" do
    post teams_path(@design.id, "members"), params: { email: "nobody@example.com" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity

    post teams_path(@design.id, "members"), params: { email: "teams-ada@example.com" }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
  end

  test "a plain member cannot add or remove people" do
    post teams_path(@design.id, "members"), params: { email: "teams-bo@example.com" }, headers: headers_for(@member), as: :json
    assert_response :forbidden

    delete teams_path(@design.id, "members", @design_ada.id), headers: headers_for(@member)
    assert_response :forbidden
    assert TeamMembership.exists?(@design_ada.id)
  end

  test "removing someone from the team takes the access they only had through it" do
    delete teams_path(@design.id, "members", @design_ada.id), headers: headers_for(@admin)
    assert_response :success
    assert_equal [], response.parsed_body["members"]

    get "/api/v1/workspace", headers: headers_for(@ada, workspace: @space)
    assert_response :not_found
  end

  test "a person on a team can leave it and loses the access it gave them" do
    delete teams_path(@design.id, "members", @design_ada.id), headers: headers_for(@ada)
    assert_response :no_content
    assert_not TeamMembership.exists?(@design_ada.id)

    get "/api/v1/workspace", headers: headers_for(@ada, workspace: @space)
    assert_response :not_found
  end

  test "leaving a team keeps the person's own membership and role" do
    @space.memberships.create!(user: @ada, role: :viewer)
    @design.update!(role: :admin)
    get "/api/v1/workspace", headers: headers_for(@ada, workspace: @space)
    assert_equal "admin", response.parsed_body["role"]

    delete teams_path(@design.id, "members", @design_ada.id), headers: headers_for(@ada)
    assert_response :no_content

    get "/api/v1/workspace", headers: headers_for(@ada, workspace: @space)
    assert_response :success
    assert_equal "viewer", response.parsed_body["role"]
  end

  test "an admin can leave a team they are on" do
    admin_row = @design.memberships.create!(user: @admin)
    delete teams_path(@design.id, "members", admin_row.id), headers: headers_for(@admin)
    assert_response :no_content
    assert_not TeamMembership.exists?(admin_row.id)
  end

  test "leaving a team does not let a team member remove someone else" do
    bo_row = @design.memberships.create!(user: @bo)

    delete teams_path(@design.id, "members", bo_row.id), headers: headers_for(@ada)
    assert_response :forbidden
    assert TeamMembership.exists?(bo_row.id)
    assert TeamMembership.exists?(@design_ada.id)
  end

  test "someone with no access to the Space cannot use a team membership id" do
    delete teams_path(@design.id, "members", @design_ada.id), headers: headers_for(@bo)
    assert_response :not_found
    assert TeamMembership.exists?(@design_ada.id)
  end

  test "team roles decide what a team-only person can do" do
    @space.teams.create!(name: "Readers", role: :viewer).memberships.create!(user: @bo)

    post "/api/v1/tasks", params: { task: { title: "By design" } }, headers: headers_for(@ada, workspace: @space), as: :json
    assert_response :created

    post "/api/v1/tasks", params: { task: { title: "By reader" } }, headers: headers_for(@bo, workspace: @space), as: :json
    assert_response :forbidden

    get "/api/v1/tasks", headers: headers_for(@bo, workspace: @space)
    assert_response :success
    assert_equal [ "By design" ], response.parsed_body.map { |t| t["title"] }
  end

  test "the spaces list shows the role a person has through a team" do
    get "/api/v1/workspaces", headers: headers_for(@ada)
    assert_response :success
    roles = response.parsed_body.to_h { |w| [ w["name"], w["role"] ] }
    assert_equal "member", roles["Studio"]
    assert_equal "owner", roles["Ada's Space"]
  end

  test "a team with the admin role lets its people manage the space" do
    patch "/api/v1/workspace", params: { workspace: { name: "Nope" } }, headers: headers_for(@ada, workspace: @space), as: :json
    assert_response :forbidden

    @design.update!(role: :admin)
    patch "/api/v1/workspace", params: { workspace: { name: "Renamed" } }, headers: headers_for(@ada, workspace: @space), as: :json
    assert_response :success
    assert_equal "Renamed", @space.reload.name

    post teams_path, params: { team: { name: "Writers" } }, headers: headers_for(@ada), as: :json
    assert_response :created
  end

  test "a team never makes anyone an owner" do
    @design.update!(role: :admin)
    delete "/api/v1/workspaces/#{@space.id}", headers: headers_for(@ada)
    assert_response :forbidden
    assert Workspace.exists?(@space.id)
  end

  test "a person's own membership keeps its higher role over a weaker team" do
    @design.update!(role: :viewer)
    @space.memberships.create!(user: @ada, role: :member)

    post "/api/v1/tasks", params: { task: { title: "Still can write" } }, headers: headers_for(@ada, workspace: @space), as: :json
    assert_response :created
  end

  test "documents in a space are reachable by team-only people with the team's role" do
    doc = @space.root_folder.documents.create!(title: "Plan", doc_type: :document, created_by: @owner)

    get "/api/v1/documents/#{doc.id}", headers: headers_for(@ada)
    assert_response :success

    @design.update!(role: :viewer)
    patch "/api/v1/documents/#{doc.id}", params: { document: { title: "Nope" } }, headers: headers_for(@ada), as: :json
    assert_response :forbidden

    get "/api/v1/documents/#{doc.id}", headers: headers_for(@bo)
    assert_response :not_found
  end
end
