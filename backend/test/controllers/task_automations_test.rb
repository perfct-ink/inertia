require "test_helper"

# PATCH /api/v1/tasks/:id runs the Space's automations when it changes a
# task's status: the answer shows what they did and names the rules that ran.
class TaskAutomationsTest < ActionDispatch::IntegrationTest
  setup do
    @previous_bypass = ENV["BYPASS_AUTH"]
    ENV["BYPASS_AUTH"] = "false"
    @owner = User.create!(name: "Owner", email: "task-automations-owner@example.com", password: "password123")
    @ada = User.create!(name: "Ada", email: "task-automations-ada@example.com", password: "password123")
    @space = Workspace.create!(name: "Studio", user: @owner)
    @space.memberships.create!(user: @ada, role: :member)
    token, = Warden::JWTAuth::UserEncoder.new.call(@owner, :user, nil)
    @headers = { "Authorization" => "Bearer #{token}", "X-Workspace-Id" => @space.id.to_s }
    @task = @space.tasks.create!(title: "Ship it", status: :in_review, priority: :urgent)
    @rule = @space.automation_rules.create!(
      name: "Done goes to Ada", trigger_type: "task_status_changed", trigger_config: { "to" => "done" },
      conditions: [ { "field" => "priority", "operator" => "equals", "value" => "urgent" } ],
      actions: [ { "type" => "assign", "config" => { "user_id" => @ada.id } } ]
    )
  end

  teardown { ENV["BYPASS_AUTH"] = @previous_bypass }

  def patch_task(task, attrs)
    patch "/api/v1/tasks/#{task.id}", params: { task: attrs }, headers: @headers, as: :json
  end

  test "finishing a task runs the automation and the answer shows its result" do
    patch_task(@task, status: "done")
    assert_response :success
    assert_equal "done", response.parsed_body["status"]
    assert_equal @ada.id, response.parsed_body["assignee_id"]
    assert_equal [ { "rule_id" => @rule.id, "rule_name" => "Done goes to Ada" } ], response.parsed_body["automations"]
    assert_equal @ada, @task.reload.assignee
  end

  test "an edit that leaves the status alone runs nothing" do
    patch_task(@task, title: "Ship it today", priority: "urgent")
    assert_response :success
    assert_equal [], response.parsed_body["automations"]
    assert_nil @task.reload.assignee
  end

  test "a status change the rule does not match runs nothing" do
    patch_task(@task, status: "in_progress")
    assert_response :success
    assert_equal [], response.parsed_body["automations"]
    assert_nil @task.reload.assignee
  end

  test "a switched-off automation does not run" do
    @rule.update!(enabled: false)
    patch_task(@task, status: "done")
    assert_equal [], response.parsed_body["automations"]
    assert_nil @task.reload.assignee
  end

  test "an automation that fails does not stop the edit" do
    @space.memberships.find_by(user: @ada).destroy!
    patch_task(@task, status: "done")
    assert_response :success
    assert_equal "done", response.parsed_body["status"]
    assert_equal [], response.parsed_body["automations"]
    assert_nil @task.reload.assignee
  end

  test "an edit that is refused runs no automation" do
    patch_task(@task, status: "done", title: "")
    assert_response :unprocessable_entity
    assert_nil @task.reload.assignee
  end
end
