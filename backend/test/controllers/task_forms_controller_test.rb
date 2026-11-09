require "test_helper"

class TaskFormsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    @previous_public = Rails.configuration.x.public_forms_enabled
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "owner-forms-api@example.com", password: "password123")
    @member = User.create!(name: "Member", email: "member-forms-api@example.com", password: "password123")
    @viewer = User.create!(name: "Viewer", email: "viewer-forms-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown do
    ENV["BYPASS_AUTH"] = @previous_bypass
    Rails.configuration.x.public_forms_enabled = @previous_public
  end

  def headers_for(user)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @team.id.to_s }
  end

  test "a member builds a form, lists it with its response count, edits it and deletes it" do
    post "/api/v1/task_forms", params: { task_form: { title: "Report a bug", default_status: "todo" } }, headers: headers_for(@member), as: :json
    assert_response :created
    id = response.parsed_body["id"]
    assert_equal %w[title details], response.parsed_body["questions"].map { |q| q["id"] }
    assert_equal "todo", response.parsed_body["default_status"]
    assert_nil response.parsed_body["token"]

    patch "/api/v1/task_forms/#{id}", params: { task_form: { questions: [
      { id: "summary", label: "Summary", kind: "short_text", target: "title" },
      { id: "severity", label: "Severity", kind: "choice", target: "details", options: %w[High Low], required: true }
    ] } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_equal [ true, true ], response.parsed_body["questions"].map { |q| q["required"] }

    post "/api/v1/task_forms/#{id}/submissions", params: { answers: { summary: "Broken", severity: "High" } }, headers: headers_for(@member), as: :json
    assert_response :created

    get "/api/v1/task_forms", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ [ "Report a bug", 1 ] ], response.parsed_body.map { |f| [ f["title"], f["submissions_count"] ] }

    delete "/api/v1/task_forms/#{id}", headers: headers_for(@member)
    assert_response :no_content
    assert_equal [ "Broken" ], @team.tasks.pluck(:title)
  end

  test "a form can be read on its own, whichever project is open" do
    project = @team.folders.create!(name: "Website", kind: :project)
    form = @team.task_forms.create!(title: "Ask")
    get "/api/v1/task_forms/#{form.id}", headers: headers_for(@viewer).merge("X-Project-Id" => project.id.to_s)
    assert_response :success
    assert_equal "Ask", response.parsed_body["title"]
    assert_equal 0, response.parsed_body["submissions_count"]
  end

  test "with a project open, the list is its forms and a new form is filed in it" do
    project = @team.folders.create!(name: "Website", kind: :project)
    sub = @team.folders.create!(name: "Docs", parent: project)
    other = @team.folders.create!(name: "Mobile", kind: :project)
    @team.task_forms.create!(title: "In project", folder: project)
    @team.task_forms.create!(title: "In subfolder", folder: sub)
    @team.task_forms.create!(title: "Elsewhere", folder: other)
    @team.task_forms.create!(title: "Space wide")
    scoped = headers_for(@member).merge("X-Project-Id" => project.id.to_s)

    get "/api/v1/task_forms", headers: scoped
    assert_equal [ "In project", "In subfolder" ], response.parsed_body.map { |f| f["title"] }

    get "/api/v1/task_forms", headers: headers_for(@member)
    assert_equal 4, response.parsed_body.size

    post "/api/v1/task_forms", params: { task_form: { title: "Made here" } }, headers: scoped, as: :json
    assert_response :created
    assert_equal project.id, response.parsed_body["folder_id"]
    post "/api/v1/task_forms/#{response.parsed_body['id']}/submissions", params: { answers: { title: "Filed" } }, headers: scoped, as: :json
    assert_equal project.id, @team.tasks.find_by!(title: "Filed").folder_id
  end

  test "invalid questions are a 422 with the reasons" do
    post "/api/v1/task_forms", params: { task_form: { title: "Bad", questions: [ { id: "a", label: "A", kind: "short_text", target: "details" } ] } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "A form needs a question for the task's title"
  end

  test "filling in a form creates a task and lists the response" do
    form = @team.task_forms.create!(title: "Ask", default_status: "todo")
    post "/api/v1/task_forms/#{form.id}/submissions", params: { answers: { title: "Order laptops", details: "Two please" } }, headers: headers_for(@member), as: :json
    assert_response :created
    assert_equal "Order laptops", response.parsed_body["task_title"]
    assert_equal "todo", response.parsed_body["task_status"]
    assert_equal "Member", response.parsed_body["submitted_by_name"]

    task = @team.tasks.find_by!(title: "Order laptops")
    assert_equal "Two please", task.description

    get "/api/v1/task_forms/#{form.id}/submissions", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ task.id ], response.parsed_body.map { |s| s["task_id"] }
    assert_equal [ [ "Title", "Order laptops" ], [ "Details", "Two please" ] ], response.parsed_body.first["answers"].map { |a| [ a["label"], a["value"] ] }
  end

  test "wrong answers and closed forms are a 422 and make no task" do
    form = @team.task_forms.create!(title: "Ask")
    assert_no_difference "Task.count" do
      post "/api/v1/task_forms/#{form.id}/submissions", params: { answers: { details: "no title" } }, headers: headers_for(@member), as: :json
      assert_response :unprocessable_entity
      assert_equal [ "Title can't be blank" ], response.parsed_body["errors"]

      form.update!(enabled: false)
      post "/api/v1/task_forms/#{form.id}/submissions", params: { answers: { title: "x" } }, headers: headers_for(@member), as: :json
      assert_response :unprocessable_entity
      assert_equal [ "This form is closed" ], response.parsed_body["errors"]
    end
  end

  test "a viewer can read forms but not change them or fill them in" do
    form = @team.task_forms.create!(title: "Ask")
    post "/api/v1/task_forms", params: { task_form: { title: "Nope" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { title: "Nope" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
    delete "/api/v1/task_forms/#{form.id}", headers: headers_for(@viewer)
    assert_response :forbidden
    post "/api/v1/task_forms/#{form.id}/submissions", params: { answers: { title: "x" } }, headers: headers_for(@viewer), as: :json
    assert_response :forbidden
  end

  test "forms of another space are not found" do
    foreign = User.create!(name: "O", email: "o-forms-api@example.com", password: "password123").workspace.task_forms.create!(title: "Theirs")
    patch "/api/v1/task_forms/#{foreign.id}", params: { task_form: { title: "Mine" } }, headers: headers_for(@member), as: :json
    assert_response :not_found
    post "/api/v1/task_forms/#{foreign.id}/submissions", params: { answers: { title: "x" } }, headers: headers_for(@member), as: :json
    assert_response :not_found
    get "/api/v1/task_forms", headers: headers_for(@member)
    assert_empty response.parsed_body
  end

  test "only an admin or owner turns the public link on; any member can turn it off" do
    Rails.configuration.x.public_forms_enabled = true
    form = @team.task_forms.create!(title: "Ask")

    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { public_access: true } }, headers: headers_for(@member), as: :json
    assert_response :forbidden
    assert_not form.reload.public_access?

    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { public_access: true } }, headers: headers_for(@owner), as: :json
    assert_response :success
    assert_equal form.reload.token, response.parsed_body["token"]
    assert response.parsed_body["public_links_available"]

    # Saving other changes while the link is already on is a normal edit.
    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { title: "Renamed", public_access: true } }, headers: headers_for(@member), as: :json
    assert_response :success

    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { public_access: false } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_nil response.parsed_body["token"]
  end

  test "the public link can't be turned on while the server switch is off" do
    Rails.configuration.x.public_forms_enabled = false
    form = @team.task_forms.create!(title: "Ask")
    patch "/api/v1/task_forms/#{form.id}", params: { task_form: { public_access: true } }, headers: headers_for(@owner), as: :json
    assert_response :unprocessable_entity
    assert_includes response.parsed_body["errors"], "Public access isn't available on this server"
  end
end
