require "test_helper"

# The Hierarchy page moves an item by patching its new parent and position
# together, and orders siblings by `position` (see data/hierarchy.ts planMove).
class HierarchyMovesTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-hierarchy-moves@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-hierarchy-moves@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @headers = headers_for(@user)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: nil)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    headers = { "Authorization" => "Bearer #{token}" }
    headers["X-Workspace-Id"] = workspace.id.to_s if workspace
    headers
  end

  test "initiatives and epics start at position 0 and take a new one with their new parent" do
    milestone = @user.workspace.milestones.create!(title: "Beta")
    initiative = @user.workspace.initiatives.create!(title: "Growth")
    epic = @user.workspace.epics.create!(title: "Checkout")

    get "/api/v1/initiatives", headers: @headers
    assert_equal 0, response.parsed_body.first["position"]
    get "/api/v1/epics", headers: @headers
    assert_equal 0, response.parsed_body.first["position"]

    patch "/api/v1/initiatives/#{initiative.id}", params: { initiative: { milestone_id: milestone.id, position: 4 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ milestone.id, 4 ], response.parsed_body.values_at("milestone_id", "position")

    patch "/api/v1/epics/#{epic.id}", params: { epic: { initiative_id: initiative.id, milestone_id: nil, position: -1 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ initiative.id, -1 ], response.parsed_body.values_at("initiative_id", "position")
  end

  test "a task takes a new parent and position in one update" do
    epic = @user.workspace.epics.create!(title: "Checkout")
    parent = @user.workspace.tasks.create!(title: "Parent")
    task = @user.workspace.tasks.create!(title: "Child", epic: epic)

    patch "/api/v1/tasks/#{task.id}", params: { task: { parent_id: parent.id, position: 3 } }, headers: @headers, as: :json
    assert_response :success
    assert_equal [ parent.id, epic.id, 3 ], response.parsed_body.values_at("parent_id", "epic_id", "position")
  end

  test "a position that is not a whole number is rejected" do
    epic = @user.workspace.epics.create!(title: "Checkout")

    patch "/api/v1/epics/#{epic.id}", params: { epic: { position: "later" } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/epics/#{epic.id}", params: { epic: { position: nil } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    patch "/api/v1/initiatives/#{@user.workspace.initiatives.create!(title: "I").id}", params: { initiative: { position: 2.5 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal 0, epic.reload.position
  end

  test "a rejected move says why" do
    top = @user.workspace.tasks.create!(title: "Top")
    sub = @user.workspace.tasks.create!(title: "Sub", parent: top)

    patch "/api/v1/tasks/#{top.id}", params: { task: { parent_id: sub.id, position: 1 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal [ "Parent can't be one of this task's own subtasks" ], response.parsed_body["errors"]
    assert_nil top.reload.parent_id
    assert_equal 0, top.position
  end

  test "an epic cannot be moved under an initiative of another Space" do
    foreign = @team.initiatives.create!(title: "Elsewhere")
    epic = @user.workspace.epics.create!(title: "Checkout")

    patch "/api/v1/epics/#{epic.id}", params: { epic: { initiative_id: foreign.id, position: 1 } }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_nil epic.reload.initiative_id
  end

  test "viewers cannot reorder" do
    epic = @team.epics.create!(title: "Checkout")

    patch "/api/v1/epics/#{epic.id}", params: { epic: { position: 2 } }, headers: headers_for(@viewer, workspace: @team), as: :json
    assert_response :forbidden
    assert_equal 0, epic.reload.position
  end
end
