require "test_helper"

class ProjectRequestTest < ActiveSupport::TestCase
  setup do
    @owner = User.create!(name: "Owner", email: "owner-pr-model@example.com", password: "password123")
    @workspace = Workspace.create!(name: "Team", user: @owner)
    @requester = User.create!(name: "Rae", email: "rae-pr-model@example.com", password: "password123")
    @workspace.memberships.create!(user: @requester, role: :member)
  end

  def build_request(**attrs)
    @workspace.project_requests.create!({ name: "Billing revamp", requested_by: @requester }.merge(attrs))
  end

  test "a new request is pending with medium priority" do
    request = build_request
    assert request.pending?
    assert request.priority_medium?
    assert_nil request.project
  end

  test "a request needs a name and its target date cannot precede its start date" do
    assert_not @workspace.project_requests.new(name: "").valid?

    request = @workspace.project_requests.new(name: "X", start_date: Date.new(2026, 12, 1), target_date: Date.new(2026, 11, 1))
    assert_not request.valid?
    assert_includes request.errors[:target_date], "can't be before the start date"
  end

  test "priority and status only accept their listed values" do
    assert_not @workspace.project_requests.new(name: "X", priority: "urgent").valid?
    assert_not @workspace.project_requests.new(name: "X", status: "maybe").valid?
  end

  test "approving creates a project folder under the root and records the decision" do
    request = build_request

    request.approve!(by: @owner, note: "Go ahead")

    assert request.approved?
    assert_equal @owner, request.decided_by
    assert_equal "Go ahead", request.decision_note
    assert request.decided_at.present?
    project = request.project
    assert project.project?
    assert_equal "Billing revamp", project.name
    assert_equal @workspace.root_folder_id, project.parent_id
    assert_equal @workspace.id, project.workspace_id
  end

  test "a request can only be approved once" do
    request = build_request
    request.approve!(by: @owner)

    error = assert_raises(ActiveRecord::RecordInvalid) { ProjectRequest.find(request.id).approve!(by: @owner) }
    assert_includes error.record.errors[:base], "Only a pending request can be approved"
    assert_equal 1, @workspace.folders.where(kind: :project).count
  end

  test "declining needs a reason and creates no project" do
    request = build_request

    assert_raises(ActiveRecord::RecordInvalid) { request.decline!(by: @owner, note: " ") }
    assert request.reload.pending?

    request.decline!(by: @owner, note: "No budget this quarter")
    assert request.declined?
    assert_equal "No budget this quarter", request.decision_note
    assert_nil request.project
    assert_equal 0, @workspace.folders.where(kind: :project).count
  end

  test "a declined request can be reopened but an approved one cannot" do
    declined = build_request
    declined.decline!(by: @owner, note: "Later")
    declined.reopen!
    assert declined.pending?
    assert_nil declined.decided_by
    assert_nil declined.decided_at
    assert_nil declined.decision_note

    approved = build_request(name: "Other")
    approved.approve!(by: @owner)
    error = assert_raises(ActiveRecord::RecordInvalid) { ProjectRequest.find(approved.id).reopen! }
    assert_includes error.record.errors[:base], "Only a declined request can be reopened"
  end

  test "deleting the created project keeps the request" do
    request = build_request
    request.approve!(by: @owner)

    request.project.destroy

    assert_nil request.reload.project_id
    assert request.approved?
  end
end
