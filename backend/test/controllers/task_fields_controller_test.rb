require "test_helper"

class TaskFieldsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @user = User.create!(name: "Pat", email: "pat-tf-api@example.com", password: "password123")
    @teammate = User.create!(name: "Tess", email: "tess-tf-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-tf-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @user)
    @team.memberships.create!(user: @teammate, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
    @task = @team.tasks.create!(title: "Ship it")
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def create_field(name, type, options: [])
    @team.task_fields.create!(name: name, field_type: type, options: options)
  end

  def field_path(field) = "/api/v1/tasks/#{@task.id}/field_values/#{field.id}"

  test "create, list, rename and delete a field" do
    post "/api/v1/task_fields", params: { task_field: { name: "Stage", field_type: "dropdown", options: [ "Draft", "Final" ] } }, headers: headers_for(@user), as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert_equal({ "name" => "Stage", "field_type" => "dropdown", "options" => [ "Draft", "Final" ] }, response.parsed_body.slice("name", "field_type", "options"))

    patch "/api/v1/task_fields/#{id}", params: { task_field: { name: "Phase", options: [ "Final", "Shipped" ], field_type: "tags" } }, headers: headers_for(@user), as: :json
    assert_response :success
    assert_equal "Phase", response.parsed_body["name"]
    assert_equal "dropdown", response.parsed_body["field_type"]

    get "/api/v1/task_fields", headers: headers_for(@teammate)
    assert_equal [ "Phase" ], response.parsed_body.map { |f| f["name"] }

    delete "/api/v1/task_fields/#{id}", headers: headers_for(@user)
    assert_response :no_content
    assert_equal 0, TaskField.count
  end

  test "invalid fields are rejected with the reason" do
    post "/api/v1/task_fields", params: { task_field: { name: "Stage", field_type: "dropdown" } }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
    assert_match(/Options/, response.parsed_body["errors"].join)

    post "/api/v1/task_fields", params: { task_field: { name: "Odd", field_type: "emoji" } }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
  end

  test "fields are scoped to the Space and viewers cannot change them" do
    field = create_field("Stars", "rating")
    mine = User.create!(name: "Out", email: "out-tf-api@example.com", password: "password123")

    get "/api/v1/task_fields", headers: headers_for(mine, workspace: mine.workspace)
    assert_empty response.parsed_body
    patch "/api/v1/task_fields/#{field.id}", params: { task_field: { name: "Hacked" } }, headers: headers_for(mine, workspace: mine.workspace), as: :json
    assert_response :not_found

    get "/api/v1/task_fields", headers: headers_for(@viewer)
    assert_response :success
    post "/api/v1/task_fields", params: { task_field: { name: "Nope", field_type: "checkbox" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    delete "/api/v1/task_fields/#{field.id}", headers: headers_for(@viewer)
    assert_response :forbidden
  end

  test "set and clear each kind of value, listed with the tasks" do
    tags = create_field("Labels", "tags")
    stage = create_field("Stage", "dropdown", options: [ "Draft", "Final" ])
    reviewed = create_field("Reviewed", "checkbox")
    stars = create_field("Stars", "rating")

    put field_path(tags), params: { value: [ " api ", "API", "ui" ] }, headers: headers_for(@user), as: :json
    assert_response :success
    assert_equal [ "api", "ui" ], response.parsed_body["field_values"][tags.id.to_s]
    put field_path(stage), params: { value: "Final" }, headers: headers_for(@user), as: :json
    put field_path(reviewed), params: { value: true }, headers: headers_for(@user), as: :json
    put field_path(stars), params: { value: 4 }, headers: headers_for(@user), as: :json
    assert_response :success

    get "/api/v1/tasks", headers: headers_for(@teammate)
    values = response.parsed_body.first["field_values"]
    assert_equal({ tags.id.to_s => [ "api", "ui" ], stage.id.to_s => "Final", reviewed.id.to_s => true, stars.id.to_s => 4 }, values)

    put field_path(reviewed), params: { value: false }, headers: headers_for(@user), as: :json
    put field_path(stars), params: { value: nil }, headers: headers_for(@user), as: :json
    assert_response :success
    assert_equal [ tags.id.to_s, stage.id.to_s ].sort, response.parsed_body["field_values"].keys.sort
  end

  test "invalid values are rejected and leave the stored value alone" do
    stage = create_field("Stage", "dropdown", options: [ "Draft" ])
    stars = create_field("Stars", "rating")
    put field_path(stars), params: { value: 3 }, headers: headers_for(@user), as: :json

    put field_path(stage), params: { value: "Nope" }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
    put field_path(stars), params: { value: 9 }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
    assert_equal 3, @task.field_values.find_by(task_field: stars).value
  end

  test "values are scoped to the Space and viewers cannot set them" do
    stars = create_field("Stars", "rating")
    mine = User.create!(name: "Out", email: "out-tf-api-2@example.com", password: "password123")

    put field_path(stars), params: { value: 3 }, headers: headers_for(mine, workspace: mine.workspace), as: :json
    assert_response :not_found
    put field_path(stars), params: { value: 3 }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    assert_equal 0, TaskFieldValue.count
  end

  test "each member casts and takes back only their own vote" do
    votes = create_field("Votes", "vote")

    put "#{field_path(votes)}/vote", params: { voted: true }, headers: headers_for(@user), as: :json
    assert_response :success
    put "#{field_path(votes)}/vote", params: { voted: true }, headers: headers_for(@teammate), as: :json
    assert_equal [ @user.id, @teammate.id ], response.parsed_body["field_values"][votes.id.to_s]

    put "#{field_path(votes)}/vote", params: { voted: true }, headers: headers_for(@teammate), as: :json
    assert_equal [ @user.id, @teammate.id ], response.parsed_body["field_values"][votes.id.to_s]

    put "#{field_path(votes)}/vote", params: { voted: false }, headers: headers_for(@user), as: :json
    assert_equal [ @teammate.id ], response.parsed_body["field_values"][votes.id.to_s]
    put "#{field_path(votes)}/vote", params: { voted: false }, headers: headers_for(@teammate), as: :json
    assert_equal({}, response.parsed_body["field_values"])
    assert_equal 0, TaskFieldValue.count
  end

  test "votes cannot be written as plain values, and only vote fields take votes" do
    votes = create_field("Votes", "vote")
    stars = create_field("Stars", "rating")

    put field_path(votes), params: { value: [ @teammate.id ] }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
    put "#{field_path(stars)}/vote", params: { voted: true }, headers: headers_for(@user), as: :json
    assert_response :unprocessable_entity
    put "#{field_path(votes)}/vote", params: { voted: true }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
  end
end
