require "test_helper"

class ProjectRequestsControllerTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owen", email: "owner-pr-api@example.com", password: "password123")
    @admin = User.create!(name: "Ada", email: "admin-pr-api@example.com", password: "password123")
    @member = User.create!(name: "Mia", email: "member-pr-api@example.com", password: "password123")
    @other = User.create!(name: "Otto", email: "other-pr-api@example.com", password: "password123")
    @viewer = User.create!(name: "Vi", email: "viewer-pr-api@example.com", password: "password123")
    @outsider = User.create!(name: "Out", email: "outsider-pr-api@example.com", password: "password123")
    @team = Workspace.create!(name: "Team", user: @owner)
    @team.memberships.create!(user: @admin, role: :admin)
    @team.memberships.create!(user: @member, role: :member)
    @team.memberships.create!(user: @other, role: :member)
    @team.memberships.create!(user: @viewer, role: :viewer)
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def headers_for(user, workspace: @team)
    token, = Warden::JWTAuth::UserEncoder.new.call(user, :user, nil)
    { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => workspace.id.to_s }
  end

  def submit(user, **attrs)
    post "/api/v1/project_requests", params: { project_request: { name: "Billing revamp" }.merge(attrs) }, headers: headers_for(user), as: :json
    response.parsed_body
  end

  test "a member submits a request and every member can read it" do
    body = submit(@member, description: "Rework invoicing", justification: "Finance asked", priority: "high",
                           start_date: "2026-12-01", target_date: "2027-02-01")
    assert_response :created
    assert_equal "pending", body["status"]
    assert_equal "high", body["priority"]
    assert_equal @member.id, body["requested_by_id"]
    assert_equal "Mia", body["requested_by_name"]
    assert_equal "2027-02-01", body["target_date"]

    get "/api/v1/project_requests", headers: headers_for(@viewer)
    assert_response :success
    assert_equal [ "Billing revamp" ], response.parsed_body.map { |r| r["name"] }
  end

  test "a request needs a name and sensible dates and priority" do
    submit(@member, name: "")
    assert_response :unprocessable_entity

    submit(@member, start_date: "2026-12-01", target_date: "2026-11-01")
    assert_response :unprocessable_entity

    submit(@member, priority: "urgent")
    assert_response :unprocessable_entity
  end

  test "a viewer cannot submit and a non-member cannot see the space" do
    submit(@viewer)
    assert_response :forbidden

    get "/api/v1/project_requests", headers: headers_for(@outsider)
    assert_response :not_found
  end

  test "requests are scoped to the selected space" do
    submit(@member)
    get "/api/v1/project_requests", headers: headers_for(@member, workspace: @member.workspace)
    assert_response :success
    assert_equal [], response.parsed_body
  end

  test "the submitter edits a pending request but not someone else's or a decided one" do
    id = submit(@member)["id"]

    patch "/api/v1/project_requests/#{id}", params: { project_request: { name: "Billing v2" } }, headers: headers_for(@member), as: :json
    assert_response :success
    assert_equal "Billing v2", response.parsed_body["name"]

    patch "/api/v1/project_requests/#{id}", params: { project_request: { name: "Hijack" } }, headers: headers_for(@other), as: :json
    assert_response :forbidden

    patch "/api/v1/project_requests/#{id}", params: { project_request: { name: "" } }, headers: headers_for(@member), as: :json
    assert_response :unprocessable_entity

    post "/api/v1/project_requests/#{id}/approve", headers: headers_for(@admin), as: :json
    patch "/api/v1/project_requests/#{id}", params: { project_request: { name: "Late" } }, headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_equal "Billing v2", ProjectRequest.find(id).name
  end

  test "an admin approves a request and the project appears under the root" do
    id = submit(@member)["id"]

    post "/api/v1/project_requests/#{id}/approve", params: { decision_note: "Go ahead" }, headers: headers_for(@admin), as: :json
    assert_response :success
    body = response.parsed_body
    assert_equal "approved", body["status"]
    assert_equal "Go ahead", body["decision_note"]
    assert_equal "Ada", body["decided_by_name"]

    project = @team.folders.find(body["project_id"])
    assert project.project?
    assert_equal "Billing revamp", project.name
    assert_equal @team.root_folder_id, project.parent_id

    post "/api/v1/project_requests/#{id}/approve", headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_equal 1, @team.folders.where(kind: :project).count
  end

  test "only admins and owners can decide" do
    id = submit(@member)["id"]

    %w[approve decline reopen].each do |action|
      post "/api/v1/project_requests/#{id}/#{action}", params: { decision_note: "x" }, headers: headers_for(@member), as: :json
      assert_response :forbidden
    end
    assert ProjectRequest.find(id).pending?

    post "/api/v1/project_requests/#{id}/approve", headers: headers_for(@owner), as: :json
    assert_response :success
  end

  test "declining needs a reason and a declined request can be reopened" do
    id = submit(@member)["id"]

    post "/api/v1/project_requests/#{id}/decline", headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
    assert_equal [ "Reason can't be blank" ], response.parsed_body["errors"]

    post "/api/v1/project_requests/#{id}/decline", params: { decision_note: "No budget" }, headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal "declined", response.parsed_body["status"]
    assert_nil response.parsed_body["project_id"]
    assert_equal 0, @team.folders.where(kind: :project).count

    post "/api/v1/project_requests/#{id}/reopen", headers: headers_for(@admin), as: :json
    assert_response :success
    assert_equal "pending", response.parsed_body["status"]
    assert_nil response.parsed_body["decision_note"]

    post "/api/v1/project_requests/#{id}/reopen", headers: headers_for(@admin), as: :json
    assert_response :unprocessable_entity
  end

  test "the submitter withdraws a pending request; admins delete any request" do
    id = submit(@member)["id"]

    delete "/api/v1/project_requests/#{id}", headers: headers_for(@other)
    assert_response :forbidden

    delete "/api/v1/project_requests/#{id}", headers: headers_for(@member)
    assert_response :no_content

    decided = submit(@member)["id"]
    post "/api/v1/project_requests/#{decided}/approve", headers: headers_for(@admin), as: :json
    delete "/api/v1/project_requests/#{decided}", headers: headers_for(@member)
    assert_response :forbidden

    delete "/api/v1/project_requests/#{decided}", headers: headers_for(@admin)
    assert_response :no_content
    assert_equal 1, @team.folders.where(kind: :project).count
  end
end
