require "test_helper"

class SavedViewsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-views-api@example.com", password: "password123")
    @admin = User.create!(name: "Ada", email: "admin-views-api@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-views-api@example.com", password: "password123")
    @other_member = User.create!(name: "Other", email: "other-views-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-views-api@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @owner)
    @workspace.memberships.create!(user: @admin, role: :admin)
    @workspace.memberships.create!(user: @member, role: :member)
    @workspace.memberships.create!(user: @other_member, role: :member)
    @workspace.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @workspace.id.to_s }
  end

  def create_view(user, shared: false, name: "My view", page: "task_table", config: { sortKey: "due_date", hidden: [ "epic" ] })
    post "/api/v1/saved_views", params: { saved_view: { page: page, name: name, shared: shared, config: config } }, headers: headers_for(user), as: :json
    response.parsed_body
  end

  test "create a view and list it with its config and owner" do
    created = create_view(@member)
    assert_response :created
    assert_equal({ "sortKey" => "due_date", "hidden" => [ "epic" ] }, created["config"])
    assert_equal false, created["shared"]
    assert_equal @member.id, created["user_id"]

    get "/api/v1/saved_views", params: { page: "task_table" }, headers: headers_for(@member)
    assert_response :success
    assert_equal [ "My view" ], response.parsed_body.map { |v| v["name"] }
    assert_equal "Member", response.parsed_body.first["owner_name"]
  end

  test "the list can be narrowed to one page" do
    create_view(@member, name: "Table", page: "task_table")
    create_view(@member, name: "Pivot", page: "pivot", config: { rowDim: "epic", colDim: "status" })
    get "/api/v1/saved_views", params: { page: "pivot" }, headers: headers_for(@member)
    assert_equal [ "Pivot" ], response.parsed_body.map { |v| v["name"] }
    get "/api/v1/saved_views", headers: headers_for(@member)
    assert_equal %w[Pivot Table], response.parsed_body.map { |v| v["name"] }
  end

  test "private views are only visible to their owner; shared ones to the whole Space, viewers included" do
    create_view(@member, name: "Private")
    create_view(@member, shared: true, name: "Shared")
    [ @owner, @admin, @other_member, @viewer ].each do |user|
      get "/api/v1/saved_views", headers: headers_for(user)
      assert_equal [ "Shared" ], response.parsed_body.map { |v| v["name"] }, user.name
    end
    get "/api/v1/saved_views", headers: headers_for(@member)
    assert_equal %w[Private Shared], response.parsed_body.map { |v| v["name"] }
  end

  test "an owner changes and deletes their own views, shared or private" do
    private_id = create_view(@member, name: "Private")["id"]
    shared_id = create_view(@member, shared: true, name: "Shared")["id"]

    patch "/api/v1/saved_views/#{private_id}", params: { saved_view: { name: "Mine now", shared: true, config: { groupBy: "epic" } } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_equal "Mine now", response.parsed_body["name"]
    assert_equal true, response.parsed_body["shared"]
    assert_equal({ "groupBy" => "epic" }, response.parsed_body["config"])

    delete "/api/v1/saved_views/#{shared_id}", headers: headers_for(@member)
    assert_response :no_content
    assert_not SavedView.exists?(shared_id)
  end

  test "someone else's private view is not found, to change or to delete" do
    private_id = create_view(@member, name: "Private")["id"]
    [ @owner, @admin, @other_member ].each do |user|
      patch "/api/v1/saved_views/#{private_id}", params: { saved_view: { name: "Hijack" } }, headers: headers_for(user), as: :json
      assert_response :not_found, user.name
      delete "/api/v1/saved_views/#{private_id}", headers: headers_for(user)
      assert_response :not_found, user.name
    end
    assert_equal "Private", SavedView.find(private_id).name
  end

  test "an admin or owner of the Space changes a shared view; another member cannot" do
    shared_id = create_view(@member, shared: true, name: "Shared")["id"]

    patch "/api/v1/saved_views/#{shared_id}", params: { saved_view: { name: "Renamed" } }, headers: headers_for(@other_member), as: :json
    assert_response :forbidden
    delete "/api/v1/saved_views/#{shared_id}", headers: headers_for(@other_member)
    assert_response :forbidden
    assert_equal "Shared", SavedView.find(shared_id).name

    patch "/api/v1/saved_views/#{shared_id}", params: { saved_view: { name: "Renamed" } }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal "Renamed", response.parsed_body["name"]
    assert_equal @member.id, response.parsed_body["user_id"]

    delete "/api/v1/saved_views/#{shared_id}", headers: headers_for(@owner)
    assert_response :no_content
  end

  test "viewers can apply shared views but not save, change or delete any" do
    shared_id = create_view(@member, shared: true, name: "Shared")["id"]
    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: "Mine", config: {} } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    patch "/api/v1/saved_views/#{shared_id}", params: { saved_view: { name: "x" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    delete "/api/v1/saved_views/#{shared_id}", headers: headers_for(@viewer)
    assert_response :forbidden
  end

  test "the page and the owner cannot be changed by an update" do
    id = create_view(@member, name: "Mine")["id"]
    patch "/api/v1/saved_views/#{id}", params: { saved_view: { page: "pivot", user_id: @owner.id, name: "Still mine" } }, headers: headers_for(@member), as: :json
    assert_response :success
    view = SavedView.find(id)
    assert_equal "task_table", view.page
    assert_equal @member.id, view.user_id
    assert_equal "Still mine", view.name
  end

  test "bad input returns the reasons" do
    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: "", config: {} } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Name can't be blank"

    post "/api/v1/saved_views", params: { saved_view: { page: "nope", name: "x", config: {} } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity

    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: "x", config: "not an object" } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Config must be an object"

    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: "x" } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
  end

  test "another space's views are not visible or reachable" do
    stranger = User.create!(name: "O", email: "o-views-api@example.com", password: "password123")
    theirs = stranger.workspace.saved_views.create!(user: stranger, page: "task_table", name: "Theirs", config: {}, shared: true)
    get "/api/v1/saved_views", headers: headers_for(@owner)
    assert_empty response.parsed_body
    patch "/api/v1/saved_views/#{theirs.id}", params: { saved_view: { name: "x" } }, headers: headers_for(@owner), as: :json
    assert_response :not_found
  end

  test "views belong to the Space named in the header" do
    create_view(@owner, name: "In the team Space")
    get "/api/v1/saved_views", headers: { "Authorization" => headers_for(@owner)["Authorization"] }
    assert_response :success
    assert_empty response.parsed_body
  end
end
