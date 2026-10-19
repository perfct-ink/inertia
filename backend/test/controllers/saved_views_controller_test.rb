require "test_helper"

class SavedViewsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-views-api@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-views-api@example.com", password: "password123")
    @workspace = @owner.workspace
    @workspace.memberships.create!(user: @member, role: :member)
    @owner_headers = headers_for(@owner)
    @member_headers = headers_for(@member)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @workspace.id.to_s }
  end

  def create_view(headers, shared: false, name: "My view")
    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: name, shared: shared, config: { sortKey: "due_date", hidden: [ "epic" ] } } }, headers: headers, as: :json
    response.parsed_body
  end

  test "create a view and list it with its config" do
    created = create_view(@member_headers)
    assert_response :created
    assert_equal({ "sortKey" => "due_date", "hidden" => [ "epic" ] }, created["config"])

    get "/api/v1/saved_views", params: { page: "task_table" }, headers: @member_headers
    assert_equal [ "My view" ], response.parsed_body.map { |v| v["name"] }
    assert_equal "Member", response.parsed_body.first["owner_name"]
  end

  test "private views are only visible to their owner; shared ones to the Space" do
    create_view(@member_headers, name: "Private")
    create_view(@member_headers, shared: true, name: "Shared")
    get "/api/v1/saved_views", headers: @owner_headers
    assert_equal [ "Shared" ], response.parsed_body.map { |v| v["name"] }
  end

  test "only the owner changes a view, and a Space admin can change a shared one" do
    private_id = create_view(@member_headers, name: "Private")["id"]
    shared_id = create_view(@member_headers, shared: true, name: "Shared")["id"]

    patch "/api/v1/saved_views/#{private_id}", params: { saved_view: { name: "Hijack" } }, headers: @owner_headers, as: :json
    assert_response :not_found
    patch "/api/v1/saved_views/#{shared_id}", params: { saved_view: { name: "Renamed" } }, headers: @owner_headers, as: :json
    assert_response :success
    patch "/api/v1/saved_views/#{private_id}", params: { saved_view: { name: "Mine now" } }, headers: @member_headers, as: :json
    assert_equal "Mine now", response.parsed_body["name"]

    other_member = User.create!(name: "Other", email: "other-views-api@example.com", password: "password123")
    @workspace.memberships.create!(user: other_member, role: :member)
    delete "/api/v1/saved_views/#{shared_id}", headers: headers_for(other_member)
    assert_response :forbidden
    delete "/api/v1/saved_views/#{shared_id}", headers: @member_headers
    assert_response :no_content
  end

  test "bad input returns an error" do
    post "/api/v1/saved_views", params: { saved_view: { page: "task_table", name: "", config: {} } }, headers: @member_headers, as: :json
    assert_response :unprocessable_entity
  end

  test "another space's views are not visible" do
    other = User.create!(name: "O", email: "o-views-api@example.com", password: "password123")
    other.workspace.saved_views.create!(user: other, page: "task_table", name: "Theirs", config: {}, shared: true)
    get "/api/v1/saved_views", headers: @owner_headers
    assert_empty response.parsed_body
  end
end
