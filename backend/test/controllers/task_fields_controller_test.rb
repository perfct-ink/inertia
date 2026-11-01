require "test_helper"

class TaskFieldsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Pat", email: "pat-tf-api@example.com", password: "password123")
    @admin = User.create!(name: "Ad", email: "admin-tf-api@example.com", password: "password123")
    @member = User.create!(name: "Mo", email: "member-tf-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-tf-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def create_field(user, name: "Estimate", data_type: "integer")
    post "/api/v1/task_fields", params: { task_field: { name: name, data_type: data_type } }, headers: headers_for(user), as: :json
  end

  test "an owner creates, renames, lists and deletes a field" do
    create_field(@owner)
    assert_response :created
    id = response.parsed_body["id"]
    assert_equal({ "name" => "Estimate", "data_type" => "integer" }, response.parsed_body.slice("name", "data_type"))

    patch "/api/v1/task_fields/#{id}", params: { task_field: { name: "Points" } }, headers: headers_for(@owner), as: :json
    assert_response :success
    assert_equal "Points", response.parsed_body["name"]

    get "/api/v1/task_fields", headers: headers_for(@owner)
    assert_equal [ "Points" ], response.parsed_body.map { |f| f["name"] }

    delete "/api/v1/task_fields/#{id}", headers: headers_for(@owner)
    assert_response :no_content
    assert_equal 0, @team.task_fields.count
  end

  test "an admin can define fields; members and viewers can only read them" do
    create_field(@admin)
    assert_response :created
    id = response.parsed_body["id"]

    [ @member, @viewer ].each do |user|
      create_field(user, name: "Nope")
      assert_response :forbidden
      patch "/api/v1/task_fields/#{id}", params: { task_field: { name: "Nope" } }, headers: headers_for(user), as: :json
      assert_response :forbidden
      delete "/api/v1/task_fields/#{id}", headers: headers_for(user)
      assert_response :forbidden

      get "/api/v1/task_fields", headers: headers_for(user)
      assert_response :success
      assert_equal [ "Estimate" ], response.parsed_body.map { |f| f["name"] }
    end
  end

  test "invalid fields answer 422 with the reasons" do
    create_field(@owner, data_type: "relation")
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].join, "Data type"

    create_field(@owner)
    create_field(@owner, name: "estimate", data_type: "text")
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"].join, "Name"
  end

  test "fields are per Space and another Space's fields are not found" do
    create_field(@owner)
    id = response.parsed_body["id"]
    outsider = User.create!(name: "Out", email: "out-tf-api@example.com", password: "password123")

    get "/api/v1/task_fields", headers: headers_for(outsider, workspace: outsider.workspace)
    assert_equal [], response.parsed_body
    patch "/api/v1/task_fields/#{id}", params: { task_field: { name: "X" } }, headers: headers_for(outsider, workspace: outsider.workspace), as: :json
    assert_response :not_found
    get "/api/v1/task_fields", headers: headers_for(outsider)
    assert_response :not_found
  end

  test "tasks carry values through create, update, clear and list" do
    create_field(@owner)
    estimate = response.parsed_body["id"].to_s
    create_field(@owner, name: "Reviewed", data_type: "boolean")
    reviewed = response.parsed_body["id"].to_s

    post "/api/v1/tasks", params: { task: { title: "Ship", custom_fields: { estimate => 3 } } }, headers: headers_for(@member), as: :json
    assert_response :created
    task_id = response.parsed_body["id"]
    assert_equal({ estimate => 3 }, response.parsed_body["custom_fields"])

    patch "/api/v1/tasks/#{task_id}", params: { task: { custom_fields: { reviewed => false, estimate => 5 } } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_equal({ estimate => 5, reviewed => false }, response.parsed_body["custom_fields"])

    patch "/api/v1/tasks/#{task_id}", params: { task: { title: "Ship it" } }, headers: headers_for(@member), as: :json
    assert_equal({ estimate => 5, reviewed => false }, response.parsed_body["custom_fields"], "other updates keep the values")

    patch "/api/v1/tasks/#{task_id}", params: { task: { custom_fields: { estimate => nil } } }, headers: headers_for(@member), as: :json
    assert_equal({ reviewed => false }, response.parsed_body["custom_fields"])

    @team.tasks.create!(title: "No values")
    get "/api/v1/tasks", headers: headers_for(@viewer)
    assert_response :success
    by_title = response.parsed_body.to_h { |t| [ t["title"], t["custom_fields"] ] }
    assert_equal({ "Ship it" => { reviewed => false }, "No values" => {} }, by_title)
  end

  test "a bad value or an unknown field rejects the update and changes nothing" do
    create_field(@owner)
    estimate = response.parsed_body["id"].to_s
    task = @team.tasks.create!(title: "Ship", custom_fields: { estimate => 1 })

    patch "/api/v1/tasks/#{task.id}", params: { task: { title: "Renamed", custom_fields: { estimate => "many" } } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
    assert_equal [ "Estimate must be a whole number" ], response.parsed_body["errors"]
    assert_equal "Ship", task.reload.title
    assert_equal({ estimate => 1 }, task.custom_fields)

    other = User.create!(name: "Out", email: "out2-tf-api@example.com", password: "password123").workspace.task_fields.create!(name: "Foreign", data_type: "text")
    patch "/api/v1/tasks/#{task.id}", params: { task: { custom_fields: { other.id.to_s => "x" } } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
    assert_equal [ "Unknown custom field #{other.id}" ], response.parsed_body["errors"]
  end

  test "a viewer cannot set values" do
    create_field(@owner)
    estimate = response.parsed_body["id"].to_s
    task = @team.tasks.create!(title: "Ship")
    patch "/api/v1/tasks/#{task.id}", params: { task: { custom_fields: { estimate => 1 } } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    assert_equal({}, task.reload.custom_fields)
  end

  test "folder contents and events still render tasks without the values" do
    task = @team.tasks.create!(title: "Embedded")
    event = @team.events.create!(title: "Launch", date: Date.current, event_type: :deadline)
    event.tasks << task
    get "/api/v1/events", headers: headers_for(@owner)
    assert_response :success
    assert_equal [ "Embedded" ], response.parsed_body.first["tasks"].map { |t| t["title"] }
    assert_not response.parsed_body.first["tasks"].first.key?("custom_fields")
  end
end
